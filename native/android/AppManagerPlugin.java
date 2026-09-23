package com.hk1boxtv.app;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.StatFs;
import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStreamReader;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 应用管理插件：让前端能读取设备上真实安装的应用、启动它们、卸载它们，
 * 并在应用被安装 / 卸载 / 更新时主动通知前端刷新列表。
 *
 * 为什么必须放原生层：
 *  - WebView 里的网页没有能力枚举设备已装应用（浏览器沙箱限制），只能走 PackageManager。
 *  - 应用图标同样只能由 PackageManager 取，并转成 base64 才能回传给 JS。
 *  - 卸载需要发系统 Intent（ACTION_DELETE）或走 root。
 *
 * 注意：Android 11 (API 30) 起，不声明 QUERY_ALL_PACKAGES 权限就只能看到
 * 与本应用有交互的部分包名，所以 manifest 必须加该权限（见 scripts/patch-android-apps.py）。
 */
@CapacitorPlugin(name = "AppManager")
public class AppManagerPlugin extends Plugin {

    private static final String TAG = "AppManagerPlugin";

    private BroadcastReceiver packageReceiver;
    private boolean watching = false;

    /** 缓存 root 可用性，避免每次卸载都重新探测 */
    private Boolean rootAvailable = null;

    // ------------------------------------------------------------------
    // 工具
    // ------------------------------------------------------------------

    /** PackageManager 等操作可能耗时，统一丢到后台线程执行 */
    private void runAsync(Runnable r) {
        bridge.execute(r);
    }

    /**
     * 回调统一回主线程。
     * Capacitor 的 PluginCall.resolve 本身不做线程切换，从后台线程直接回调
     * 有一定风险（WebView / Activity 相关），这里统一切到 UI 线程最稳。
     */
    private void runOnUi(Runnable r) {
        Activity act = getActivity();
        if (act != null) {
            act.runOnUiThread(r);
        } else {
            bridge.executeOnMainThread(r);
        }
    }

    private void resolveOnUi(final PluginCall call, final JSObject data) {
        runOnUi(new Runnable() {
            @Override
            public void run() {
                call.resolve(data);
            }
        });
    }

    private void rejectOnUi(final PluginCall call, final String msg) {
        runOnUi(new Runnable() {
            @Override
            public void run() {
                call.reject(msg);
            }
        });
    }

    // ------------------------------------------------------------------
    // 列出已安装应用
    // ------------------------------------------------------------------
    @PluginMethod
    public void listApps(final PluginCall call) {
        runAsync(new Runnable() {
            @Override
            public void run() {
                try {
                    Context ctx = getContext();
                    PackageManager pm = ctx.getPackageManager();
                    String self = ctx.getPackageName();

                    // 多来源合并再取并集。
                    //
                    // 背景：Android 11+ 有「包可见性」过滤，理论上声明 QUERY_ALL_PACKAGES
                    // 就能看到全部应用；实测在 HyperOS 3 / Android 16 上授权 granted=true
                    // 时 getInstalledApplications() 仍只返回应用自己，
                    // 因此这里额外从「带启动入口的应用」补齐，哪个来源能用都不至于空列表。
                    Map<String, ApplicationInfo> merged = new LinkedHashMap<String, ApplicationInfo>();

                    int nInstalled = 0;
                    try {
                        @SuppressWarnings("deprecation")
                        List<ApplicationInfo> direct = pm.getInstalledApplications(0);
                        if (direct != null) {
                            nInstalled = direct.size();
                            for (ApplicationInfo ai : direct) {
                                if (ai != null && ai.packageName != null) merged.put(ai.packageName, ai);
                            }
                        }
                    } catch (Exception e) {
                        Log.w(TAG, "getInstalledApplications 失败: " + e.getMessage());
                    }

                    int nLauncher = collectLaunchables(pm, Intent.CATEGORY_LAUNCHER, merged);
                    int nLeanback = collectLaunchables(pm, Intent.CATEGORY_LEANBACK_LAUNCHER, merged);

                    // 可见性探针：抽查几个常见包是否可见，用来判断是否被包可见性过滤
                    String[] probePkgs = { "com.android.settings", "com.android.vending", "com.tencent.mm" };
                    int probes = 0;
                    for (String p : probePkgs) {
                        try {
                            pm.getPackageInfo(p, 0);
                            probes++;
                        } catch (Exception ignored) {
                        }
                    }

                    Log.i(TAG, "应用来源统计: getInstalledApplications=" + nInstalled
                            + ", launcher=" + nLauncher
                            + ", leanback=" + nLeanback
                            + ", 合并后=" + merged.size()
                            + ", 可见性探针=" + probes + "/" + probePkgs.length);

                    JSArray arr = new JSArray();
                    for (ApplicationInfo ai : merged.values()) {
                        if (ai == null || ai.packageName == null) continue;

                        JSObject o = new JSObject();
                        o.put("packageName", ai.packageName);

                        CharSequence label = null;
                        try {
                            label = pm.getApplicationLabel(ai);
                        } catch (Exception ignored) {
                        }
                        o.put("name",
                                label == null || label.length() == 0 ? ai.packageName : label.toString());

                        boolean isSystem = (ai.flags & ApplicationInfo.FLAG_SYSTEM) != 0
                                || (ai.flags & ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) != 0;
                        o.put("isSystem", isSystem);
                        o.put("isSelf", ai.packageName.equals(self));

                        boolean launchable = false;
                        try {
                            launchable = pm.getLaunchIntentForPackage(ai.packageName) != null;
                        } catch (Exception ignored) {
                        }
                        o.put("launchable", launchable);

                        String versionName = "";
                        long versionCode = 0;
                        try {
                            PackageInfo pi = pm.getPackageInfo(ai.packageName, 0);
                            if (pi.versionName != null) versionName = pi.versionName;
                            versionCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                                    ? pi.getLongVersionCode()
                                    : pi.versionCode;
                        } catch (Exception ignored) {
                        }
                        o.put("versionName", versionName);
                        o.put("versionCode", versionCode);

                        o.put("isTv", isTvApp(pm, ai.packageName));
                        o.put("category", guessCategory(ai, isSystem));
                        o.put("sizeBytes", querySize(ai));

                        arr.put(o);
                    }

                    JSObject diag = new JSObject();
                    diag.put("installedApplications", nInstalled);
                    diag.put("launcherActivities", nLauncher);
                    diag.put("leanbackActivities", nLeanback);
                    diag.put("merged", merged.size());
                    diag.put("probes", probes);

                    JSObject ret = new JSObject();
                    ret.put("apps", arr);
                    ret.put("count", arr.length());
                    ret.put("diag", diag);
                    resolveOnUi(call, ret);
                } catch (Exception e) {
                    rejectOnUi(call, "读取应用列表失败: " + e.getMessage());
                }
            }
        });
    }

    /**
     * 把某个 Intent category 下所有能启动的应用并入 merged。
     * 返回该 category 查到的条目数（用于诊断）。
     */
    private int collectLaunchables(PackageManager pm, String category,
                                   Map<String, ApplicationInfo> merged) {
        try {
            Intent intent = new Intent(Intent.ACTION_MAIN, null);
            intent.addCategory(category);
            @SuppressWarnings("deprecation")
            List<ResolveInfo> list = pm.queryIntentActivities(intent, 0);
            if (list == null) return 0;
            for (ResolveInfo ri : list) {
                if (ri == null || ri.activityInfo == null || ri.activityInfo.applicationInfo == null) continue;
                ApplicationInfo ai = ri.activityInfo.applicationInfo;
                if (ai.packageName != null && !merged.containsKey(ai.packageName)) {
                    merged.put(ai.packageName, ai);
                }
            }
            return list.size();
        } catch (Exception e) {
            Log.w(TAG, "queryIntentActivities(" + category + ") 失败: " + e.getMessage());
            return 0;
        }
    }

    /** 是否声明了 Leanback（Android TV）启动入口 */
    private boolean isTvApp(PackageManager pm, String pkg) {
        try {
            Intent intent = new Intent(Intent.ACTION_MAIN);
            intent.addCategory(Intent.CATEGORY_LEANBACK_LAUNCHER);
            intent.setPackage(pkg);
            List<ResolveInfo> list = pm.queryIntentActivities(intent, 0);
            return list != null && !list.isEmpty();
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * 粗略分类。只能依据 ApplicationInfo.category（API 26+，且需要应用自己声明），
     * 绝大多数应用没声明，因此多数会落到 tools（前端展示为「其它」）。
     */
    private String guessCategory(ApplicationInfo ai, boolean isSystem) {
        if (isSystem) return "system";
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (ai.category == ApplicationInfo.CATEGORY_GAME) return "games";
            if (ai.category == ApplicationInfo.CATEGORY_VIDEO
                    || ai.category == ApplicationInfo.CATEGORY_AUDIO
                    || ai.category == ApplicationInfo.CATEGORY_IMAGE) {
                return "media";
            }
        }
        return "tools";
    }

    /**
     * 应用体积 = APK 本体 + 各 Split APK 的大小。
     *
     * 这里刻意不去查「安装 + 数据」总占用：
     * android.app.usage.StorageStatsManager.queryStatsForPackage() 查询**其他**应用
     * 需要 PACKAGE_USAGE_STATS（系统级签名权限），普通应用调用必然抛 SecurityException，
     * 与其写一段永远走不到的分支，不如用确定可得的安装包体积，
     * 界面上也如实标注为「安装包大小」。
     */
    private long querySize(ApplicationInfo ai) {
        long size = 0;
        try {
            File base = new File(ai.sourceDir);
            if (base.exists()) size += base.length();
        } catch (Exception ignored) {
        }
        try {
            // App Bundle 方式安装的应用会拆成多个 apk
            String[] splits = ai.splitSourceDirs;
            if (splits != null) {
                for (String s : splits) {
                    if (s == null) continue;
                    File f = new File(s);
                    if (f.exists()) size += f.length();
                }
            }
        } catch (Exception ignored) {
        }
        return size;
    }

    // ------------------------------------------------------------------
    // 取应用图标（base64 PNG）
    // ------------------------------------------------------------------
    @PluginMethod
    public void getIcon(final PluginCall call) {
        final String pkg = call.getString("packageName");
        if (pkg == null || pkg.length() == 0) {
            call.reject("缺少 packageName");
            return;
        }
        Integer sizeOpt = call.getInt("size", 96);
        final int size = sizeOpt == null ? 96 : sizeOpt;

        runAsync(new Runnable() {
            @Override
            public void run() {
                try {
                    PackageManager pm = getContext().getPackageManager();
                    Drawable d = pm.getApplicationIcon(pkg);
                    Bitmap bmp = drawableToBitmap(d, size);
                    ByteArrayOutputStream bos = new ByteArrayOutputStream();
                    bmp.compress(Bitmap.CompressFormat.PNG, 100, bos);
                    String b64 = Base64.encodeToString(bos.toByteArray(), Base64.NO_WRAP);

                    JSObject ret = new JSObject();
                    ret.put("packageName", pkg);
                    ret.put("dataUrl", "data:image/png;base64," + b64);
                    resolveOnUi(call, ret);
                } catch (Exception e) {
                    rejectOnUi(call, "读取图标失败: " + e.getMessage());
                }
            }
        });
    }

    private Bitmap drawableToBitmap(Drawable d, int size) {
        if (d instanceof BitmapDrawable) {
            Bitmap src = ((BitmapDrawable) d).getBitmap();
            if (src != null && src.getWidth() > 1 && src.getHeight() > 1) {
                return Bitmap.createScaledBitmap(src, size, size, true);
            }
        }
        Bitmap out = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(out);
        d.setBounds(0, 0, size, size);
        d.draw(canvas);
        return out;
    }

    // ------------------------------------------------------------------
    // 启动应用
    // ------------------------------------------------------------------
    @PluginMethod
    public void launchApp(final PluginCall call) {
        final String pkg = call.getString("packageName");
        if (pkg == null || pkg.length() == 0) {
            call.reject("缺少 packageName");
            return;
        }

        runOnUi(new Runnable() {
            @Override
            public void run() {
                try {
                    PackageManager pm = getContext().getPackageManager();
                    Intent intent = pm.getLaunchIntentForPackage(pkg);
                    if (intent == null) {
                        call.reject("该应用没有可打开的界面（可能已被停用）");
                        return;
                    }
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(intent);
                    call.resolve();
                } catch (Exception e) {
                    call.reject("启动失败: " + e.getMessage());
                }
            }
        });
    }

    // ------------------------------------------------------------------
    // 卸载应用
    // ------------------------------------------------------------------
    @PluginMethod
    public void uninstallApp(final PluginCall call) {
        final String pkg = call.getString("packageName");
        if (pkg == null || pkg.length() == 0) {
            call.reject("缺少 packageName");
            return;
        }
        Boolean allowRootOpt = call.getBoolean("allowRoot");
        final boolean allowRoot = allowRootOpt == null || allowRootOpt;

        runAsync(new Runnable() {
            @Override
            public void run() {
                // 路径一：设备已 root（装了 Magisk 的盒子 / 车机）→ 静默卸载，体验最好
                if (allowRoot && hasRoot() && silentUninstall(pkg)) {
                    JSObject ret = new JSObject();
                    ret.put("mode", "silent");
                    ret.put("success", true);
                    resolveOnUi(call, ret);
                    return;
                }

                // 路径二：交给系统卸载界面（会弹系统确认框），无需任何特殊权限
                runOnUi(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            Intent intent = new Intent(
                                    Intent.ACTION_DELETE, Uri.parse("package:" + pkg));
                            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            getContext().startActivity(intent);

                            JSObject ret = new JSObject();
                            ret.put("mode", "system");
                            ret.put("success", true);
                            resolveOnUi(call, ret);
                        } catch (Exception e) {
                            call.reject("无法打开卸载界面: " + e.getMessage());
                        }
                    }
                });
            }
        });
    }

    /** 探测 su 是否可用（结果缓存；带超时，避免 su 弹窗把线程挂死） */
    private synchronized boolean hasRoot() {
        if (rootAvailable != null) return rootAvailable;
        rootAvailable = runSu("id", 4000) != null;
        return rootAvailable;
    }

    /** root 静默卸载：pm uninstall --user 0 <pkg> */
    private boolean silentUninstall(String pkg) {
        String out = runSu("pm uninstall --user 0 " + pkg, 15000);
        return out != null && out.toLowerCase().contains("success");
    }

    /**
     * 执行 su -c "<cmd>"，带超时保护。
     * 返回命令输出；su 不存在 / 用户拒绝 / 超时 一律返回 null。
     */
    private String runSu(final String cmd, long timeoutMs) {
        Process proc = null;
        try {
            proc = Runtime.getRuntime().exec(new String[] { "su", "-c", cmd });
            final Process p = proc;
            final StringBuilder sb = new StringBuilder();

            Thread reader = new Thread(new Runnable() {
                @Override
                public void run() {
                    BufferedReader br = null;
                    try {
                        br = new BufferedReader(new InputStreamReader(p.getInputStream()));
                        String line;
                        while ((line = br.readLine()) != null) {
                            sb.append(line).append('\n');
                        }
                    } catch (Exception ignored) {
                    } finally {
                        try {
                            if (br != null) br.close();
                        } catch (Exception ignored) {
                        }
                    }
                }
            });
            reader.setDaemon(true);
            reader.start();

            Thread waiter = new Thread(new Runnable() {
                @Override
                public void run() {
                    try {
                        p.waitFor();
                    } catch (Exception ignored) {
                    }
                }
            });
            waiter.setDaemon(true);
            waiter.start();

            waiter.join(timeoutMs);
            reader.join(1500);

            int code;
            try {
                code = p.exitValue();
            } catch (IllegalThreadStateException e) {
                // 超时：su 弹窗无人应答，或命令挂住
                return null;
            }
            return code == 0 ? sb.toString() : null;
        } catch (Exception e) {
            return null;
        } finally {
            if (proc != null) {
                try {
                    proc.destroy();
                } catch (Exception ignored) {
                }
            }
        }
    }

    // ------------------------------------------------------------------
    // 存储信息（真实值）
    // ------------------------------------------------------------------
    @PluginMethod
    public void getStorage(final PluginCall call) {
        runAsync(new Runnable() {
            @Override
            public void run() {
                try {
                    File dataDir = Environment.getDataDirectory();
                    StatFs stat = new StatFs(dataDir.getPath());
                    long total = stat.getTotalBytes();
                    long free = stat.getAvailableBytes();

                    JSObject ret = new JSObject();
                    ret.put("totalBytes", total);
                    ret.put("freeBytes", free);
                    ret.put("appCacheBytes", dirSize(getContext().getCacheDir()));
                    ret.put("appFilesBytes", dirSize(getContext().getFilesDir()));
                    resolveOnUi(call, ret);
                } catch (Exception e) {
                    rejectOnUi(call, "读取存储信息失败: " + e.getMessage());
                }
            }
        });
    }

  private long dirSize(File dir) {
    if (dir == null || !dir.exists()) return 0;
    long size = 0;
    try {
      File[] files = dir.listFiles();
      if (files == null) return 0;
      for (File f : files) {
        size += f.isDirectory() ? dirSize(f) : f.length();
      }
    } catch (Exception ignored) {
    }
    return size;
  }

  // ------------------------------------------------------------------
  // 应用详情（版本 / 安装时间 / 权限数 / 路径等）
  // ------------------------------------------------------------------
  @PluginMethod
  public void getAppInfo(final PluginCall call) {
    final String pkg = call.getString("packageName");
    if (pkg == null || pkg.length() == 0) {
      call.reject("缺少 packageName");
      return;
    }
    runAsync(new Runnable() {
      @Override
      public void run() {
        try {
          PackageManager pm = getContext().getPackageManager();
          PackageInfo pi = pm.getPackageInfo(pkg, PackageManager.GET_PERMISSIONS);
          JSObject o = new JSObject();
          o.put("packageName", pkg);
          o.put("versionName",
                  pi.versionName != null ? pi.versionName : "");
          o.put("versionCode",
                  Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                          ? pi.getLongVersionCode()
                          : pi.versionCode);
          o.put("firstInstallTime", pi.firstInstallTime);
          o.put("lastUpdateTime", pi.lastUpdateTime);
          o.put("sourceDir",
                  pi.applicationInfo != null && pi.applicationInfo.sourceDir != null
                          ? pi.applicationInfo.sourceDir : "");
          o.put("isSystem",
                  pi.applicationInfo != null
                          && ((pi.applicationInfo.flags & ApplicationInfo.FLAG_SYSTEM) != 0
                              || (pi.applicationInfo.flags & ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) != 0));
          o.put("launchable", pm.getLaunchIntentForPackage(pkg) != null);
          int permCount = 0;
          if (pi.requestedPermissions != null) permCount = pi.requestedPermissions.length;
          o.put("permissionsCount", permCount);
          resolveOnUi(call, o);
        } catch (Exception e) {
          rejectOnUi(call, "读取应用信息失败: " + e.getMessage());
        }
      }
    });
  }

  // ------------------------------------------------------------------
  // 打开系统「应用信息」页（无需任何权限，用户可在此强制停止 / 清数据 / 卸载）
  // ------------------------------------------------------------------
  @PluginMethod
  public void openAppSettings(final PluginCall call) {
    final String pkg = call.getString("packageName");
    if (pkg == null || pkg.length() == 0) {
      call.reject("缺少 packageName");
      return;
    }
    runOnUi(new Runnable() {
      @Override
      public void run() {
        try {
          Intent intent = new Intent(
                  android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
          intent.setData(Uri.parse("package:" + pkg));
          intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
          getContext().startActivity(intent);
          call.resolve();
        } catch (Exception e) {
          call.reject("无法打开应用信息页: " + e.getMessage());
        }
      }
    });
  }

  // ------------------------------------------------------------------
  // 强制停止：普通应用没有 FORCE_STOP_PACKAGES 权限，ActivityManager.forceStopPackage
  // 必然抛 SecurityException；因此走 root 的 `am force-stop`，无 root 时回退到
  // 打开系统「应用信息」页，由用户手动强制停止。
  // ------------------------------------------------------------------
  @PluginMethod
  public void forceStop(final PluginCall call) {
    final String pkg = call.getString("packageName");
    if (pkg == null || pkg.length() == 0) {
      call.reject("缺少 packageName");
      return;
    }
    runAsync(new Runnable() {
      @Override
      public void run() {
        if (hasRoot()) {
          String out = runSu("am force-stop " + pkg, 15000);
          if (out != null) {
            JSObject ret = new JSObject();
            ret.put("mode", "root");
            ret.put("success", true);
            resolveOnUi(call, ret);
            return;
          }
        }
        // 回退：打开系统应用信息页
        runOnUi(new Runnable() {
          @Override
          public void run() {
            try {
              Intent intent = new Intent(
                      android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
              intent.setData(Uri.parse("package:" + pkg));
              intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
              getContext().startActivity(intent);
              JSObject ret = new JSObject();
              ret.put("mode", "settings");
              ret.put("success", true);
              resolveOnUi(call, ret);
            } catch (Exception e) {
              rejectOnUi(call, "无法强制停止: " + e.getMessage());
            }
          }
        });
      }
    });
  }

  // ------------------------------------------------------------------
  // 监听安装 / 卸载 / 更新，主动通知前端刷新
  // ------------------------------------------------------------------
    @PluginMethod
    public void startWatching(PluginCall call) {
        if (watching) {
            call.resolve();
            return;
        }
        try {
            Context ctx = getContext();
            packageReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    String action = intent.getAction();
                    Uri data = intent.getData();
                    String pkg = data != null ? data.getSchemeSpecificPart() : null;

                    JSObject payload = new JSObject();
                    payload.put("action", action == null ? "" : action);
                    payload.put("packageName", pkg == null ? "" : pkg);
                    // notifyListeners 由 Capacitor 内部投递到 JS，线程安全
                    notifyListeners("appsChanged", payload);
                }
            };

            IntentFilter filter = new IntentFilter();
            filter.addAction(Intent.ACTION_PACKAGE_ADDED);
            filter.addAction(Intent.ACTION_PACKAGE_REMOVED);
            filter.addAction(Intent.ACTION_PACKAGE_REPLACED);
            filter.addAction(Intent.ACTION_PACKAGE_CHANGED);
            filter.addDataScheme("package");

            if (Build.VERSION.SDK_INT >= 33) {
                ctx.registerReceiver(packageReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
            } else {
                ctx.registerReceiver(packageReceiver, filter);
            }
            watching = true;
            call.resolve();
        } catch (Exception e) {
            call.reject("监听应用变化失败: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopWatching(PluginCall call) {
        unregister();
        call.resolve();
    }

    private void unregister() {
        if (!watching || packageReceiver == null) return;
        try {
            getContext().unregisterReceiver(packageReceiver);
        } catch (Exception ignored) {
        }
        watching = false;
        packageReceiver = null;
    }

    @Override
    protected void handleOnDestroy() {
        unregister();
        super.handleOnDestroy();
    }
}

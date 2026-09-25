package com.natatki;

import android.app.Application;
import com.facebook.react.PackageList;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactNativeHost;
import com.facebook.soloader.SoLoader;
import java.util.List;
import android.util.Log;

public class MainApplication extends Application implements ReactApplication {
  private static final String TAG = "MainApplication";

  private final ReactNativeHost mReactNativeHost =
      new DefaultReactNativeHost(this) {
        @Override
        public boolean getUseDeveloperSupport() {
          return BuildConfig.DEBUG;
        }

        @Override
        protected List<ReactPackage> getPackages() {
          // #region agent log
          try {
            Log.d(TAG, "getPackages called");
          } catch (Exception e) {
            Log.e(TAG, "Error in getPackages logging", e);
          }
          // #endregion
          @SuppressWarnings("UnnecessaryLocalVariable")
          List<ReactPackage> packages = new PackageList(this).getPackages();
          // #region agent log
          try {
            Log.d(TAG, "getPackages: loaded " + packages.size() + " packages");
          } catch (Exception e) {
            Log.e(TAG, "Error after PackageList creation", e);
          }
          // #endregion
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // packages.add(new MyReactNativePackage());
          return packages;
        }

        @Override
        protected String getJSMainModuleName() {
          return "index";
        }

        @Override
        protected boolean isNewArchEnabled() {
          return BuildConfig.IS_NEW_ARCHITECTURE_ENABLED;
        }

        @Override
        protected Boolean isHermesEnabled() {
          return BuildConfig.IS_HERMES_ENABLED;
        }
      };

  @Override
  public ReactNativeHost getReactNativeHost() {
    return mReactNativeHost;
  }

  @Override
  public void onCreate() {
    // #region agent log
    try {
      Log.d(TAG, "MainApplication.onCreate called");
    } catch (Exception e) {
      Log.e(TAG, "Error in onCreate start", e);
    }
    // #endregion
    super.onCreate();
    // #region agent log
    try {
      Log.d(TAG, "MainApplication.onCreate super.onCreate completed");
    } catch (Exception e) {
      Log.e(TAG, "Error after super.onCreate", e);
    }
    // #endregion
    try {
      // #region agent log
      Log.d(TAG, "Initializing SoLoader");
      // #endregion
      SoLoader.init(this, /* native exopackage */ false);
      // #region agent log
      Log.d(TAG, "SoLoader.init completed");
      // #endregion
    } catch (Exception e) {
      // #region agent log
      Log.e(TAG, "SoLoader.init failed", e);
      // #endregion
      throw e;
    }
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // #region agent log
      try {
        Log.d(TAG, "New Architecture enabled, loading entry point");
      } catch (Exception e) {
        Log.e(TAG, "Error logging new arch", e);
      }
      // #endregion
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      DefaultNewArchitectureEntryPoint.load();
      // #region agent log
      try {
        Log.d(TAG, "New Architecture entry point loaded");
      } catch (Exception e) {
        Log.e(TAG, "Error after new arch load", e);
      }
      // #endregion
    }
    try {
      // #region agent log
      Log.d(TAG, "Initializing ReactNativeFlipper");
      // #endregion
      ReactNativeFlipper.initializeFlipper(this, getReactNativeHost().getReactInstanceManager());
      // #region agent log
      Log.d(TAG, "ReactNativeFlipper initialized");
      // #endregion
    } catch (Exception e) {
      // #region agent log
      Log.e(TAG, "ReactNativeFlipper initialization failed", e);
      // #endregion
      // Don't throw - Flipper is optional
    }
    // #region agent log
    try {
      Log.d(TAG, "MainApplication.onCreate completed successfully");
    } catch (Exception e) {
      Log.e(TAG, "Error in onCreate end", e);
    }
    // #endregion
  }
}

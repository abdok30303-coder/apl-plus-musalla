using System;
using System.Globalization;
using System.IO;
using System.Runtime.InteropServices;

/*
 * APL Source Handoff
 *
 * Native source request for Samsung QN85B/Tizen 6.5. Vetro's successful source
 * switch sends CAPI from an EFL animator frame after hiding its native window.
 * This helper reproduces that ordering with a transparent 1x1 window only; it
 * never hides, exits, or otherwise changes APL itself.
 */
internal static class Program
{
    private const string AppControl = "libcapi-appfw-app-control.so.0";
    private const string Elementary = "libelementary.so.1";
    private const string Evas = "libevas.so.1";
    private const string Ecore = "libecore.so.1";
    private const string EflUtil = "libcapi-ui-efl-util.so.0";
    private const string Libc = "libc.so.6";
    private const int ElmWinNotification = 12;
    private const int NotificationLevelTop = 40;
    private const int WindowLayer = 900;
    private const string Viewer = "org.tizen.tv-viewer";
    private const string SourceIconDir = "/usr/apps/com.samsung.tv.theme-resource/shared/res/org.tizen.menu/Settings_Popup/device_icon/";
    private const string StatusFile = "/tmp/apl-native-source-handoff.status";

    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    private delegate byte FrameCallback(IntPtr data);
    private static readonly FrameCallback HandoffFrame = OnHandoffFrame;

    private static IntPtr frameWindow = IntPtr.Zero;
    private static bool elementaryStarted;
    private static int frameSourceType;
    private static string frameLabel;
    private static string frameContext;
    private static int frameExit = 74;
    private static string frameState = "efl-frame-did-not-run";

    [DllImport(Libc, SetLastError = true)]
    private static extern int setenv(string name, string value, int overwrite);

    [DllImport(Elementary)]
    private static extern int elm_init(int argc, IntPtr argv);

    [DllImport(Elementary)]
    private static extern void elm_run();

    [DllImport(Elementary)]
    private static extern void elm_exit();

    [DllImport(Elementary)]
    private static extern void elm_shutdown();

    [DllImport(Elementary)]
    private static extern IntPtr elm_win_add(IntPtr parent, string name, int type);

    [DllImport(Elementary)]
    private static extern void elm_win_alpha_set(IntPtr window, [MarshalAs(UnmanagedType.U1)] bool alpha);

    [DllImport(Elementary)]
    private static extern void elm_win_borderless_set(IntPtr window, [MarshalAs(UnmanagedType.U1)] bool borderless);

    [DllImport(Elementary)]
    private static extern void elm_win_prop_focus_skip_set(IntPtr window, [MarshalAs(UnmanagedType.U1)] bool skip);

    [DllImport(Elementary)]
    private static extern void elm_win_layer_set(IntPtr window, int layer);

    [DllImport(Elementary)]
    private static extern int elm_win_aux_hint_add(IntPtr window, string hint, string value);

    [DllImport(Elementary)]
    private static extern void elm_win_activate(IntPtr window);

    [DllImport(Evas)]
    private static extern void evas_object_move(IntPtr obj, int x, int y);

    [DllImport(Evas)]
    private static extern void evas_object_resize(IntPtr obj, int width, int height);

    [DllImport(Evas)]
    private static extern void evas_object_show(IntPtr obj);

    [DllImport(Evas)]
    private static extern void evas_object_hide(IntPtr obj);

    [DllImport(Ecore)]
    private static extern IntPtr ecore_animator_add(FrameCallback callback, IntPtr data);

    [DllImport(EflUtil)]
    private static extern int efl_util_set_notification_window_level(IntPtr window, int level);

    [DllImport(AppControl, CallingConvention = CallingConvention.Cdecl)]
    private static extern int app_control_create(out IntPtr handle);

    [DllImport(AppControl, CallingConvention = CallingConvention.Cdecl)]
    private static extern int app_control_destroy(IntPtr handle);

    [DllImport(AppControl, CallingConvention = CallingConvention.Cdecl)]
    private static extern int app_control_set_app_id(IntPtr handle, string appId);

    [DllImport(AppControl, CallingConvention = CallingConvention.Cdecl)]
    private static extern int app_control_add_extra_data(IntPtr handle, string key, string value);

    [DllImport(AppControl, CallingConvention = CallingConvention.Cdecl)]
    private static extern int app_control_send_launch_request(IntPtr handle, IntPtr replyCallback, IntPtr userData);

    private static void Report(string state)
    {
        try
        {
            File.WriteAllText(StatusFile, "APL_NATIVE_SOURCE_HANDOFF\nstate=" + state + "\nat=" + DateTime.UtcNow.ToString("o", CultureInfo.InvariantCulture) + "\n");
        }
        catch { }
    }

    private static int Finish(int exitCode, string state)
    {
        Report(state + " exit=" + exitCode.ToString(CultureInfo.InvariantCulture));
        return exitCode;
    }

    private static bool ValidSourceType(int value)
    {
        return value == 0 || (value >= 13 && value <= 16);
    }

    private static string SafeLabel(string label)
    {
        if (String.IsNullOrWhiteSpace(label)) return "HDMI";
        string cleaned = label.Replace('\0', ' ').Replace('\r', ' ').Replace('\n', ' ').Trim();
        return cleaned.Length > 80 ? cleaned.Substring(0, 80) : cleaned;
    }

    private static int Add(IntPtr handle, string key, string value)
    {
        int result = app_control_add_extra_data(handle, key, value);
        if (result != 0) Console.Error.WriteLine("extra " + key + " rc=" + result.ToString(CultureInfo.InvariantCulture));
        return result;
    }

    /* This is Vetro's EFL/Wayland environment. libc setenv is required because
       EFL uses native getenv rather than .NET's managed environment copy. */
    private static void SetVetroWaylandEnvironment()
    {
        setenv("HOME", "/home/owner", 1);
        setenv("XDG_RUNTIME_DIR", "/run", 1);
        setenv("WAYLAND_DISPLAY", "wayland-0", 1);
        setenv("ELM_ENGINE", "gl", 1);
        setenv("ECORE_EVAS_ENGINE", "wayland_egl", 1);
        setenv("ELM_PROFILE", "tv", 1);
        setenv("ELM_DISPLAY", "wl", 1);
        setenv("EVAS_FONT_DPI", "72", 1);
        setenv("ELM_ACCEL", "gl", 1);
        setenv("EVAS_GL_NO_BLACKLIST", "1", 1);
        setenv("ECORE_EVAS_COMP_NOSYNC", "1", 1);
        setenv("ECORE_VSYNC_DRM_ALL", "1", 1);
        setenv("ECORE_EVAS_GL_SYNC_DRAW_DONE", "1", 1);
        setenv("EVAS_GL_PARTIAL_DISABLE", "1", 1);
    }

    private static string PrepareFrameContext()
    {
        frameWindow = IntPtr.Zero;
        elementaryStarted = false;
        try
        {
            SetVetroWaylandEnvironment();
            if (elm_init(0, IntPtr.Zero) <= 0) return "efl-init-failed";
            elementaryStarted = true;
            frameWindow = elm_win_add(IntPtr.Zero, "apl-source-handoff", ElmWinNotification);
            if (frameWindow == IntPtr.Zero) return "efl-window-failed";
            elm_win_alpha_set(frameWindow, true);
            elm_win_borderless_set(frameWindow, true);
            elm_win_prop_focus_skip_set(frameWindow, false);
            efl_util_set_notification_window_level(frameWindow, NotificationLevelTop);
            elm_win_layer_set(frameWindow, WindowLayer);
            elm_win_aux_hint_add(frameWindow, "wm.policy.win.user.geometry", "1");
            elm_win_aux_hint_add(frameWindow, "wm.comp.win.effect.enable", "0");
            evas_object_move(frameWindow, 0, 0);
            evas_object_resize(frameWindow, 1, 1);
            evas_object_show(frameWindow);
            elm_win_activate(frameWindow);
            return "efl-animator-native-context";
        }
        catch (Exception e)
        {
            return "efl-context-" + e.GetType().Name;
        }
    }

    private static void ReleaseFrameContext()
    {
        try { if (frameWindow != IntPtr.Zero) evas_object_hide(frameWindow); } catch { }
        try { if (elementaryStarted) elm_shutdown(); } catch { }
        frameWindow = IntPtr.Zero;
        elementaryStarted = false;
    }

    private static int SendViewerRequest(int sourceType, string label, string context, out string state)
    {
        IntPtr handle = IntPtr.Zero;
        try
        {
            int result = app_control_create(out handle);
            if (result != 0 || handle == IntPtr.Zero)
            {
                state = "app-control-create rc=" + result.ToString(CultureInfo.InvariantCulture) + " context=" + context;
                return 70;
            }

            string number = sourceType.ToString(CultureInfo.InvariantCulture);
            string icon = SourceIconDir + (sourceType >= 13 && sourceType <= 16
                ? "r_icon_device_s_hdmi" + (sourceType - 12).ToString(CultureInfo.InvariantCulture)
                : "r_icon_device_s_tv") + ".png";

            result = app_control_set_app_id(handle, Viewer);
            if (result != 0)
            {
                state = "set-app-id rc=" + result.ToString(CultureInfo.InvariantCulture) + " context=" + context;
                return 71;
            }
            if (Add(handle, "change_source", number) != 0 ||
                Add(handle, "sourceType", number) != 0 ||
                Add(handle, "sourceName", label) != 0 ||
                Add(handle, "sourceIcon", icon) != 0 ||
                Add(handle, "mbrIndex", "-2") != 0 ||
                Add(handle, "__K_EX_LAUNCH_REQUESTOR", "user") != 0)
            {
                state = "extra-data-failed context=" + context;
                return 72;
            }

            result = app_control_send_launch_request(handle, IntPtr.Zero, IntPtr.Zero);
            state = "app-control-send rc=" + result.ToString(CultureInfo.InvariantCulture) + " context=" + context;
            Console.WriteLine("sourceType=" + number + " rc=" + result.ToString(CultureInfo.InvariantCulture) + " context=" + context);
            return result == 0 ? 0 : 73;
        }
        catch (Exception e)
        {
            state = "exception=" + e.GetType().Name + " context=" + context;
            Console.Error.WriteLine("handoff exception=" + e.GetType().Name);
            return 74;
        }
        finally
        {
            if (handle != IntPtr.Zero)
            {
                try { app_control_destroy(handle); } catch { }
            }
        }
    }

    /* Same ordering as Vetro's Program.OnFrame: Evas hides its native window,
       then SwitchSource sends the app-control request in that compositor frame. */
    private static byte OnHandoffFrame(IntPtr data)
    {
        try
        {
            if (frameWindow != IntPtr.Zero) evas_object_hide(frameWindow);
            frameExit = SendViewerRequest(frameSourceType, frameLabel, frameContext, out frameState);
        }
        catch (Exception e)
        {
            frameExit = 74;
            frameState = "frame-exception=" + e.GetType().Name + " context=" + frameContext;
        }
        try { elm_exit(); } catch { }
        return 0;
    }

    public static int Main(string[] args)
    {
        int sourceType;
        if (args == null || args.Length != 2 || !Int32.TryParse(args[0], NumberStyles.None, CultureInfo.InvariantCulture, out sourceType) || !ValidSourceType(sourceType))
        {
            Console.Error.WriteLine("usage: APLSourceHandoff <0|13..16> <source-label>");
            return Finish(64, "invalid-arguments");
        }

        frameSourceType = sourceType;
        frameLabel = SafeLabel(args[1]);
        frameExit = 74;
        frameState = "efl-frame-did-not-run";
        frameContext = PrepareFrameContext();
        Report("attempt sourceType=" + sourceType.ToString(CultureInfo.InvariantCulture) + " sourceName=" + frameLabel + " context=" + frameContext);

        try
        {
            if (frameWindow == IntPtr.Zero || !elementaryStarted)
            {
                frameExit = SendViewerRequest(frameSourceType, frameLabel, frameContext + " bare-capi", out frameState);
            }
            else if (ecore_animator_add(HandoffFrame, IntPtr.Zero) == IntPtr.Zero)
            {
                /* Availability fallback only. Normal QN85B/Vetro EFL execution
                   enters the callback above; this never adds a sleep or timer. */
                try { evas_object_hide(frameWindow); } catch { }
                frameExit = SendViewerRequest(frameSourceType, frameLabel, frameContext + " animator-unavailable", out frameState);
            }
            else
            {
                elm_run();
            }
        }
        catch (Exception e)
        {
            frameExit = 74;
            frameState = "main-exception=" + e.GetType().Name + " context=" + frameContext;
        }
        finally
        {
            ReleaseFrameContext();
        }

        return Finish(frameExit, frameState);
    }
}

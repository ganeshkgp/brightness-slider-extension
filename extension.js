const { GObject, Gio, GLib, Clutter, St } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Slider = imports.ui.slider;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const BrightnessSlider = GObject.registerClass(
class BrightnessSlider extends PanelMenu.Button {
    _init() {
        super._init(0.0, null, false);

        this._display = null;
        this._currentBrightness = 1.0;
        this._slider = null;
        this._sliderBox = null;
        this._visible = false;
        this._brightnessMethod = null; // 'xrandr', 'backlight', or 'sysfs'
        this._backlightPath = null;

        // Detect brightness control method and display
        this._detectBrightnessMethod();
        this._detectDisplay();

        // Get current brightness
        this._getCurrentBrightness();

        // Create the UI
        this._buildUI();

        // Connect to panel signals
        this._connectSignals();
    }

    _detectBrightnessMethod() {
        // Check for backlight control (preferred method for laptops)
        let backlightDirs = ['/sys/class/backlight', '/sys/class/leds'];

        for (let dir of backlightDirs) {
            if (GLib.file_test(dir, GLib.FileTest.IS_DIR)) {
                try {
                    let backlightDir = Gio.file_new_for_path(dir);
                    let enumerator = backlightDir.enumerate_children('standard::name', Gio.FileQueryInfoFlags.NONE, null);
                    let fileInfo;

                    while ((fileInfo = enumerator.next_file(null)) !== null) {
                        let devicePath = dir + '/' + fileInfo.get_name() + '/brightness';
                        if (GLib.file_test(devicePath, GLib.FileTest.IS_REGULAR)) {
                            this._brightnessMethod = 'sysfs';
                            this._backlightPath = devicePath;
                            let maxPath = dir + '/' + fileInfo.get_name() + '/max_brightness';
                            if (GLib.file_test(maxPath, GLib.FileTest.IS_REGULAR)) {
                                this._maxBrightnessPath = maxPath;
                            }
                            return;
                        }
                    }
                } catch (e) {
                    log(`Error checking backlight: ${e}`);
                }
            }
        }

        // Check for xbacklight utility
        try {
            let proc = Gio.Subprocess.new(
                ['xbacklight', '-get'],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_SILENCE
            );
            let [, stdout] = proc.communicate_utf8(null, null);
            if (proc.get_status() === 0) {
                this._brightnessMethod = 'xbacklight';
                return;
            }
        } catch (e) {
            // xbacklight not available
        }

        // Default to xrandr for external displays
        this._brightnessMethod = 'xrandr';
    }

    _detectDisplay() {
        // Try to get the primary display using xrandr
        let proc = Gio.Subprocess.new(
            ['xrandr', '--query'],
            Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_SILENCE
        );

        let [, stdout] = proc.communicate_utf8(null, null);
        let lines = stdout.split('\n');

        for (let line of lines) {
            if (line.includes(' connected') && line.includes('primary')) {
                // Extract display name (e.g., "HDMI-A-0")
                this._display = line.split(' ')[0];
                break;
            }
        }

        // Fallback to first connected display if no primary found
        if (!this._display) {
            for (let line of lines) {
                if (line.includes(' connected')) {
                    this._display = line.split(' ')[0];
                    break;
                }
            }
        }

        // Ultimate fallback
        if (!this._display) {
            this._display = 'HDMI-A-0'; // Default from your example
        }
    }

    _getCurrentBrightness() {
        try {
            switch (this._brightnessMethod) {
                case 'sysfs':
                    this._getCurrentBrightnessSysfs();
                    break;
                case 'xbacklight':
                    this._getCurrentBrightnessXbacklight();
                    break;
                case 'xrandr':
                default:
                    this._getCurrentBrightnessXrandr();
                    break;
            }
        } catch (e) {
            log(`Failed to get current brightness: ${e}`);
        }
    }

    _getCurrentBrightnessSysfs() {
        if (!this._backlightPath) return;

        let file = Gio.file_new_for_path(this._backlightPath);
        let [, contents] = file.load_contents(null);
        let currentBrightness = parseInt(new TextDecoder().decode(contents));

        if (this._maxBrightnessPath) {
            let maxFile = Gio.file_new_for_path(this._maxBrightnessPath);
            let [, maxContents] = maxFile.load_contents(null);
            let maxBrightness = parseInt(new TextDecoder().decode(maxContents));
            this._currentBrightness = currentBrightness / maxBrightness;
        } else {
            this._currentBrightness = currentBrightness / 100; // Assume percentage
        }
    }

    _getCurrentBrightnessXbacklight() {
        let proc = Gio.Subprocess.new(
            ['xbacklight', '-get'],
            Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_SILENCE
        );

        let [, stdout] = proc.communicate_utf8(null, null);
        if (proc.get_status() === 0) {
            let brightness = parseFloat(stdout.trim());
            this._currentBrightness = brightness / 100;
        }
    }

    _getCurrentBrightnessXrandr() {
        let proc = Gio.Subprocess.new(
            ['xrandr', '--verbose'],
            Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_SILENCE
        );

        let [, stdout] = proc.communicate_utf8(null, null);
        let lines = stdout.split('\n');
        let foundDisplay = false;

        for (let line of lines) {
            if (line.includes(this._display)) {
                foundDisplay = true;
                continue;
            }

            if (foundDisplay && line.includes('Brightness:')) {
                let match = line.match(/Brightness:\s*([\d.]+)/);
                if (match) {
                    this._currentBrightness = parseFloat(match[1]);
                    break;
                }
            }

            if (foundDisplay && line.includes('--')) {
                break;
            }
        }
    }

    _setBrightness(value) {
        try {
            switch (this._brightnessMethod) {
                case 'sysfs':
                    this._setBrightnessSysfs(value);
                    break;
                case 'xbacklight':
                    this._setBrightnessXbacklight(value);
                    break;
                case 'xrandr':
                default:
                    this._setBrightnessXrandr(value);
                    break;
            }
            this._currentBrightness = value;
        } catch (e) {
            log(`Failed to set brightness: ${e}`);
        }
    }

    _setBrightnessSysfs(value) {
        if (!this._backlightPath) return;

        let targetBrightness;
        if (this._maxBrightnessPath) {
            let maxFile = Gio.file_new_for_path(this._maxBrightnessPath);
            let [, maxContents] = maxFile.load_contents(null);
            let maxBrightness = parseInt(new TextDecoder().decode(maxContents));
            targetBrightness = Math.round(value * maxBrightness);
        } else {
            targetBrightness = Math.round(value * 100);
        }

        let file = Gio.file_new_for_path(this._backlightPath);
        let fileStream = file.replace(null, false, Gio.FileCreateFlags.NONE, null);
        fileStream.write(new TextEncoder().encode(targetBrightness.toString()), null);
        fileStream.close(null);
    }

    _setBrightnessXbacklight(value) {
        let percentage = Math.round(value * 100);
        Gio.Subprocess.new(
            ['xbacklight', '-set', percentage.toString()],
            Gio.SubprocessFlags.NONE
        ).wait_check(null);
    }

    _setBrightnessXrandr(value) {
        Gio.Subprocess.new(
            ['xrandr', '--output', this._display, '--brightness', value.toString()],
            Gio.SubprocessFlags.NONE
        ).wait_check(null);
    }

    _buildUI() {
        // Create the panel button (small sun icon)
        this.icon = new St.Icon({
            icon_name: 'display-brightness-symbolic',
            style_class: 'system-status-icon'
        });
        this.add_child(this.icon);

        // Create the floating slider box
        this._sliderBox = new St.BoxLayout({
            style_class: 'brightness-slider-container',
            vertical: false,
            visible: false
        });

        // Brightness icon in slider
        let brightnessIcon = new St.Icon({
            icon_name: 'display-brightness-symbolic',
            style_class: 'brightness-slider-icon'
        });

        // Create slider
        this._slider = new Slider.Slider(this._currentBrightness);
        this._slider.connect('notify::value', (slider) => {
            this._setBrightness(slider.value);
        });

        // Add components to slider box
        this._sliderBox.add_child(brightnessIcon);
        this._sliderBox.add_child(this._slider);

        // Add slider box to the stage
        Main.layoutManager.uiGroup.add_child(this._sliderBox);
    }

    _connectSignals() {
        // Show slider on hover
        this.connect('enter-event', () => {
            this._showSlider();
        });

        this.connect('leave-event', () => {
            this._hideSlider();
        });

        // Keep slider visible when hovering over it
        this._sliderBox.connect('enter-event', () => {
            this._visible = true;
        });

        this._sliderBox.connect('leave-event', () => {
            this._visible = false;
            this._hideSlider();
        });

        // Position slider when panel size changes
        Main.layoutManager.connect('monitors-changed', () => {
            this._positionSlider();
        });
    }

    _showSlider() {
        if (!this._sliderBox.visible) {
            this._positionSlider();
            this._sliderBox.visible = true;
            this._visible = true;
        }
    }

    _hideSlider() {
        if (this._visible) {
            return;
        }

        // Hide with a small delay to allow moving from icon to slider
        if (this._hideTimeout) {
            GLib.source_remove(this._hideTimeout);
        }

        this._hideTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
            if (!this._visible) {
                this._sliderBox.visible = false;
            }
            this._hideTimeout = null;
            return false;
        });
    }

    _positionSlider() {
        let [stageX, stageY] = this.get_transformed_position();
        let [panelWidth, panelHeight] = this.get_size();

        // Get monitor geometry
        let monitor = Main.layoutManager.primaryMonitor;

        // Position slider above the panel button
        let sliderWidth = 200; // Approximate width
        let sliderHeight = 30;  // Approximate height

        let sliderX = stageX + (panelWidth / 2) - (sliderWidth / 2);
        let sliderY = stageY - sliderHeight - 5; // 5px gap above panel

        // Keep slider within screen bounds
        if (sliderX < monitor.x) {
            sliderX = monitor.x;
        }
        if (sliderX + sliderWidth > monitor.x + monitor.width) {
            sliderX = monitor.x + monitor.width - sliderWidth;
        }

        this._sliderBox.set_position(sliderX, sliderY);
    }

    destroy() {
        if (this._hideTimeout) {
            GLib.source_remove(this._hideTimeout);
            this._hideTimeout = null;
        }

        if (this._sliderBox) {
            this._sliderBox.destroy();
        }

        super.destroy();
    }
});

let _brightnessSlider;

function init() {
    ExtensionUtils.initTranslations(Me.metadata['gettext-domain']);
}

function enable() {
    _brightnessSlider = new BrightnessSlider();
    Main.panel.statusArea['brightness-slider'] = _brightnessSlider;
    Main.panel.addToStatusArea('brightness-slider', _brightnessSlider, 0, 'right');
}

function disable() {
    if (_brightnessSlider) {
        _brightnessSlider.destroy();
        _brightnessSlider = null;
        delete Main.panel.statusArea['brightness-slider'];
    }
}
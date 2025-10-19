const { GObject, Gio, GLib, Clutter, St } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const Slider = imports.ui.slider;

const ExtensionUtils = imports.misc.extensionUtils;

const BrightnessSlider = GObject.registerClass(
class BrightnessSlider extends PanelMenu.Button {
    _init() {
        super._init(0.0, 'Brightness Slider', false);

        this._display = null;
        this._currentBrightness = 1.0;
        this._slider = null;
        this._sliderBox = null;
        this._visible = false;

        // Detect the primary display
        this._detectDisplay();

        // Get current brightness
        this._getCurrentBrightness();

        // Create the UI
        this._buildUI();

        // Connect to panel signals
        this._connectSignals();
    }

    _detectDisplay() {
        try {
            let proc = Gio.Subprocess.new(
                ['xrandr', '--query'],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_SILENCE
            );

            let [, stdout] = proc.communicate_utf8(null, null);
            let lines = stdout.split('\n');

            for (let line of lines) {
                if (line.includes(' connected') && line.includes('primary')) {
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
                this._display = 'HDMI-A-0';
            }
        } catch (e) {
            this._display = 'HDMI-A-0';
        }
    }

    _getCurrentBrightness() {
        try {
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
        } catch (e) {
            log(`Failed to get current brightness: ${e}`);
        }
    }

    _setBrightness(value) {
        try {
            let proc = Gio.Subprocess.new(
                ['xrandr', '--output', this._display, '--brightness', value.toString()],
                Gio.SubprocessFlags.NONE
            );
            proc.wait_check(null);
            this._currentBrightness = value;
        } catch (e) {
            log(`Failed to set brightness: ${e}`);
        }
    }

    _buildUI() {
        // Create the panel button
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
        let sliderWidth = 200;
        let sliderHeight = 30;

        let sliderX = stageX + (panelWidth / 2) - (sliderWidth / 2);
        let sliderY = stageY - sliderHeight - 5;

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
    ExtensionUtils.initTranslations();
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
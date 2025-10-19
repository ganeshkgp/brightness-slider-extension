# Brightness Slider GNOME Extension

A simple brightness control extension for GNOME Shell that displays a floating slider above the status bar.

## Features

- **Multiple Brightness Control Methods**: Automatically detects and supports:
  - **sysfs**: Direct backlight control for laptops (`/sys/class/backlight/`)
  - **xbacklight**: X11 backlight control utility
  - **xrandr**: Software brightness control for external displays

- **Cross-Platform Compatibility**: Works with different Ubuntu versions and display managers:
  - Ubuntu 18.04, 20.04, 22.04, 24.04
  - GNOME Shell 40-46
  - GDM, LightDM, SDDM display managers

- **Smart Display Detection**: Automatically finds your primary connected display

- **Floating UI**: Clean slider that appears on hover above the status bar

- **Real-time Control**: Smooth brightness adjustment with immediate feedback

## Installation

### Automatic Installation (Recommended)

1. Clone or download this extension
2. Run the installation script:
   ```bash
   ./install.sh
   ```

The script will:
- Detect your GNOME Shell version and display manager
- Install required dependencies (`x11-xserver-utils`, `xbacklight`)
- Install the extension to the correct directory
- Enable the extension
- Prompt to restart GNOME Shell

### Manual Installation

1. Install dependencies:
   ```bash
   sudo apt update
   sudo apt install x11-xserver-utils xbacklight
   ```

2. Copy extension to GNOME Shell extensions directory:
   ```bash
   cp -r brightness-slider-extension ~/.local/share/gnome-shell/extensions/brightness-slider@ganeshkgp
   ```

3. Enable the extension:
   ```bash
   gnome-extensions enable brightness-slider@ganeshkgp
   ```

4. Restart GNOME Shell:
   - Press `Alt+F2`
   - Type `r`
   - Press `Enter`

## Usage

1. Look for the brightness icon (☀) in your top status bar
2. Hover over the icon to show the brightness slider
3. Adjust the slider to change screen brightness
4. The slider will hide when you move your mouse away

## Supported Control Methods

The extension automatically detects the best available brightness control method:

### 1. sysfs (Laptops)
- Direct hardware backlight control
- Most accurate for laptop screens
- Uses `/sys/class/backlight/` directory
- Provides native brightness levels

### 2. xbacklight (Intel GPUs)
- X11 backlight control utility
- Works with many Intel graphics cards
- Provides percentage-based control

### 3. xrandr (External Displays)
- Software brightness control
- Works with all display types
- Uses gamma correction
- Fallback method for external monitors

## Troubleshooting

### Extension Not Showing

1. **Check if extension is enabled**:
   ```bash
   gnome-extensions list --enabled | grep brightness-slider
   ```

2. **Check GNOME Shell logs**:
   ```bash
   journalctl -f | grep gnome-shell
   ```

3. **Restart GNOME Shell manually**:
   - Press `Alt+F2`
   - Type `r`
   - Press `Enter`

### Brightness Control Not Working

1. **Check available brightness controls**:
   ```bash
   # Check for backlight devices
   ls /sys/class/backlight/

   # Check xrandr displays
   xrandr --query

   # Check xbacklight
   xbacklight -get
   ```

2. **Install missing dependencies**:
   ```bash
   sudo apt install x11-xserver-utils xbacklight
   ```

3. **Manually test brightness control**:
   ```bash
   # Test xrandr (replace HDMI-A-0 with your display)
   xrandr --output HDMI-A-0 --brightness 0.7

   # Test xbacklight
   xbacklight -set 70

   # Test sysfs (replace acpi_video0 with your device)
   echo 5000 | sudo tee /sys/class/backlight/acpi_video0/brightness
   ```

### Permissions Issues

If sysfs control doesn't work, you may need to add your user to the appropriate groups:

```bash
# Add to video group for backlight access
sudo usermod -a -G video $USER

# Then logout and login again
```

## File Structure

```
brightness-slider-extension/
├── metadata.json          # Extension metadata and compatibility
├── extension.js           # Main extension logic
├── stylesheet.css         # UI styling
├── install.sh            # Automated installation script
└── README.md             # This file
```

## Development

To modify the extension:

1. Make changes to the files
2. Restart GNOME Shell to see changes:
   - `Alt+F2` → `r` → `Enter`
3. Check logs for errors:
   - `journalctl -f | grep gnome-shell`

## Compatibility

- **GNOME Shell**: 40, 41, 42, 43, 44, 45, 46
- **Ubuntu**: 18.04 LTS, 20.04 LTS, 22.04 LTS, 24.04 LTS
- **Display Managers**: GDM, LightDM, SDDM
- **Graphics**: Intel, AMD, NVIDIA (xrandr fallback)

## License

This extension is released under the GPL-3.0 license.

## Support

For issues and support:
- GitHub Issues: [Create an issue](https://github.com/ganeshkgp/brightness-slider-extension/issues)
- GNOME Extensions: [Extension page](https://extensions.gnome.org/extension/brightness-slider/)

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Upload to GNOME Extensions

To upload to https://extensions.gnome.org/:

1. Package the extension:
   ```bash
   zip -r brightness-slider@ganeshkgp.zip metadata.json extension.js stylesheet.css README.md
   ```

2. Create an account on extensions.gnome.org

3. Submit the extension with proper screenshots and description

4. Wait for review and approval
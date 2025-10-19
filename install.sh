#!/bin/bash

# Brightness Slider Extension Installation Script
# Supports Ubuntu 18.04, 20.04, 22.04, 24.04 and other GNOME-based distributions

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Brightness Slider Extension Installation${NC}"
echo "=================================="

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXTENSION_NAME="brightness-slider@ganeshkgp"

# Function to detect GNOME Shell version
detect_gnome_version() {
    if command -v gnome-shell >/dev/null 2>&1; then
        GNOME_VERSION=$(gnome-shell --version | grep -oP '\d+')
        echo -e "${GREEN}Detected GNOME Shell version: $GNOME_VERSION${NC}"
    else
        echo -e "${YELLOW}Warning: Could not detect GNOME Shell version${NC}"
    fi
}

# Function to detect display manager
detect_display_manager() {
    if [ -f /etc/X11/default-display-manager ]; then
        DM=$(cat /etc/X11/default-display-manager | xargs basename)
        echo -e "${GREEN}Display Manager: $DM${NC}"
    elif systemctl is-active --quiet gdm; then
        echo -e "${GREEN}Display Manager: GDM${NC}"
    elif systemctl is-active --quiet lightdm; then
        echo -e "${GREEN}Display Manager: LightDM${NC}"
    elif systemctl is-active --quiet sddm; then
        echo -e "${GREEN}Display Manager: SDDM${NC}"
    else
        echo -e "${YELLOW}Warning: Could not detect display manager${NC}"
    fi
}

# Function to install dependencies for different Ubuntu versions
install_dependencies() {
    echo -e "${YELLOW}Checking dependencies...${NC}"

    # Check for xrandr
    if ! command -v xrandr >/dev/null 2>&1; then
        echo -e "${YELLOW}Installing x11-xserver-utils for xrandr...${NC}"
        sudo apt update
        sudo apt install -y x11-xserver-utils
    fi

    # Check for xbacklight (optional, for laptops)
    if ! command -v xbacklight >/dev/null 2>&1; then
        echo -e "${YELLOW}Installing xbacklight (optional, for laptop backlight control)...${NC}"
        sudo apt install -y xbacklight
    fi

    echo -e "${GREEN}Dependencies installed successfully${NC}"
}

# Function to create extension directory
create_extension_dir() {
    EXTENSIONS_DIR="$HOME/.local/share/gnome-shell/extensions"

    if [ ! -d "$EXTENSIONS_DIR" ]; then
        echo -e "${YELLOW}Creating extensions directory...${NC}"
        mkdir -p "$EXTENSIONS_DIR"
    fi

    TARGET_DIR="$EXTENSIONS_DIR/$EXTENSION_NAME"

    if [ -d "$TARGET_DIR" ]; then
        echo -e "${YELLOW}Removing existing extension...${NC}"
        rm -rf "$TARGET_DIR"
    fi

    echo -e "${YELLOW}Installing extension to $TARGET_DIR${NC}"
    cp -r "$SCRIPT_DIR" "$TARGET_DIR"
    chmod -R 755 "$TARGET_DIR"
}

# Function to enable the extension
enable_extension() {
    echo -e "${YELLOW}Enabling extension...${NC}"

    # List available extensions
    gnome-extensions list --enabled | grep -q "$EXTENSION_NAME" && {
        echo -e "${YELLOW}Extension already enabled, reloading...${NC}"
        gnome-extensions disable "$EXTENSION_NAME"
    }

    # Enable the extension
    gnome-extensions enable "$EXTENSION_NAME"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Extension enabled successfully!${NC}"
    else
        echo -e "${RED}Failed to enable extension. Please enable it manually:${NC}"
        echo "1. Open Extensions app (gnome-extensions)"
        echo "2. Enable 'Brightness Slider'"
        echo "3. Or run: gnome-extensions enable $EXTENSION_NAME"
    fi
}

# Function to restart GNOME Shell if needed
restart_gnome_shell() {
    echo -e "${YELLOW}GNOME Shell needs to be restarted to load the extension.${NC}"
    echo -e "${YELLOW}Press Enter to restart GNOME Shell (this will restart your session)${NC}"
    echo -e "${YELLOW}Or press Ctrl+C to restart manually later (Alt+F2, type 'r', press Enter)${NC}"
    read -r

    # Restart GNOME Shell
    echo -e "${GREEN}Restarting GNOME Shell...${NC}"
    dbus-send --type=method_call --dest=org.gnome.Shell /org/gnome/Shell org.gnome.Shell.Eval string:'global.reexec_self()'
}

# Main installation flow
main() {
    detect_gnome_version
    detect_display_manager
    install_dependencies
    create_extension_dir
    enable_extension

    echo ""
    echo -e "${GREEN}Installation completed!${NC}"
    echo -e "${GREEN}The brightness slider should now appear in your top panel.${NC}"
    echo ""
    echo "Usage:"
    echo "- Hover over the brightness icon in the top panel to show the slider"
    echo "- Adjust the slider to change screen brightness"
    echo "- The extension automatically detects your display and control method"
    echo ""
    echo "If you encounter any issues:"
    echo "1. Check the logs: journalctl -f | grep gnome-shell"
    echo "2. Make sure you have the required dependencies"
    echo "3. Restart GNOME Shell manually: Alt+F2, type 'r', press Enter"
    echo ""
    echo "For support: https://github.com/ganeshkgp/brightness-slider-extension"

    restart_gnome_shell
}

# Run main function
main "$@"
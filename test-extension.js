const { GObject, Gio, GLib, St } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;

const TestExtension = GObject.registerClass(
class TestExtension extends PanelMenu.Button {
    _init() {
        super._init(0.0, 'Test Extension', false);

        this.icon = new St.Icon({
            icon_name: 'display-brightness-symbolic',
            style_class: 'system-status-icon'
        });
        this.add_child(this.icon);

        log("Test extension loaded successfully!");
    }
});

let testExtension;

function init() {
    log("Test extension init");
}

function enable() {
    log("Test extension enable");
    testExtension = new TestExtension();
    Main.panel.addToStatusArea('test-extension', testExtension, 0, 'right');
}

function disable() {
    log("Test extension disable");
    if (testExtension) {
        testExtension.destroy();
        testExtension = null;
    }
}
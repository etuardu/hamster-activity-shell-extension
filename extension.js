'use strict';
const {St, GLib, Clutter, Gio} = imports.gi;
const Main = imports.ui.main;
const Util = imports.misc.util;
const Mainloop = imports.mainloop;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const hamWatchLib = Me.imports.hamsterWatcher;

let panelButton, panelButtonText;
let hamwatch = null;

function init () {

  panelButton = new St.Bin({
    style_class : "panel-button",
    reactive: true,
    can_focus: true,
    track_hover: true
  });

  panelButtonText = new St.Label({
    text : "...",
    y_align: Clutter.ActorAlign.CENTER,
  });

  panelButton.set_child(panelButtonText);

  panelButton.connect('button-press-event', () => {
    Util.spawnCommandLine("hamster overview");
  });

  hamwatch = new hamWatchLib.HamsterWatcher(
    panelButtonText.set_text.bind(
      panelButtonText
    )
  );

}

function enable () {
  Main.panel._rightBox.insert_child_at_index(panelButton, 1);
  hamwatch.enable();
}

function disable () {
  hamwatch.disable();
  Main.panel._rightBox.remove_child(panelButton);
}

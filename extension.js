const {St, GLib, Clutter, Gio} = imports.gi;
const Main = imports.ui.main;
const Util = imports.misc.util;
const Mainloop = imports.mainloop;

const max_task_length = 25;

let panelButton, panelButtonText, timeout;
let dbwatch = null;

class DBusWatcher {
  constructor(iface, ns, path, signal, callback) {
    this.proxy = null;
    this.connId = 0;
    this.ProxyClass = Gio.DBusProxy.makeProxyWrapper(iface);
    this.path = path;
    this.ns = ns;
    this.signal = signal;
    this.callback = callback;
  }
  enable() {
    this.proxy = new this.ProxyClass(
      Gio.DBus.session,
      this.ns,
      this.path,
      function(p) {
        this.connId = p.connectSignal(
          this.signal,
          this.callback
        );
      }.bind(this)
    );
  }
  disable() {
    if (this.connId) {
      this.proxy.disconnectSignal(this.connId);
      this.connId = 0;
    }
    if (this.proxy) {
      this.proxy = null;
    }
  }
}

/**
 * Get the current activity from hamster and
 * set the text in the panel button
 */
function setButtonText () {
    
  let arr = [];
  
  let [ok, out, err, exit] = GLib.spawn_command_line_sync('hamster current');

  let outString = out.toString().replace('\n', '');
  // outString may have the value:
  // '2020-11-16 17:21 bla bla bla@tag 00:00', if activity is running
  // 'No activity', otherwise
  
  if (!isNaN(new Date(outString.substr(0, 16)))) {
    // we have a date in the first 16 chars, so there is an activity.

    outString = outString.substr(17); // remove the date
    let outArr = outString.split(" "); // convert to array
    let elapsedTime = outArr.pop(); // get the last element of the array (time spent)
    let task = outArr.join(" "); // concatenate the other array elements
    task = (task.length > max_task_length) ?
      task.substr(0, max_task_length)+'…'
      : task; // truncate task if too long
    outString = `${task} ${elapsedTime}`;
  }
  // else: outString = 'No activity'

  panelButtonText.set_text(outString);
  
  return true;
}

function init () {

  panelButton = new St.Bin({
    style_class : "panel-button",
    reactive: true,
    can_focus: true,
    track_hover: true
  });

  panelButtonText = new St.Label({
    style_class : "examplePanelText",
    text : "...",
    y_align: Clutter.ActorAlign.CENTER,
  });

  panelButton.set_child(panelButtonText);

  panelButton.connect('button-press-event', () => {
    Util.spawnCommandLine("hamster overview");
  });

  dbwatch = new DBusWatcher(
    `<node>
      <interface name="org.gnome.Hamster">
        <signal name="FactsChanged">
        </signal>
      </interface>
    </node>`,
    "org.gnome.Hamster",
    "/org/gnome/Hamster",
    "FactsChanged",
    setButtonText
  );

}

function enable () {
  Main.panel._rightBox.insert_child_at_index(panelButton, 1);
  setButtonText();

  dbwatch.enable();
  // update the text on dbus signal,
  // to react on activity start/stop

  timeout = Mainloop.timeout_add_seconds(60, setButtonText);
  // update the text every 60 seconds
  // to refresh the elapsed time of the activity, if any
}

function disable () {
  dbwatch.disable();
  Mainloop.source_remove(timeout);
  Main.panel._rightBox.remove_child(panelButton);
}

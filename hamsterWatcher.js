'use strict';

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;

imports.package.initFormat();
// add a C-like format method to string objects

var HamsterWatcher = class HamsterWatcherClass {
  constructor(callback) {
    this.ProxyClass = Gio.DBusProxy.makeProxyWrapper(
      `<node>
        <interface name="org.gnome.Hamster">
          <signal name="FactsChanged">
          </signal>
          <method name="GetTodaysFactsJSON">
            <arg direction="out" type="as" />
          </method>
        </interface>
      </node>`
    );
    this.proxy = null;
    this.connId = 0;
    this.timer = null;
    this.activity = null;
    this.callback = callback;
  }
  enable() {
    this.proxy = new this.ProxyClass(
      Gio.DBus.session,
      "org.gnome.Hamster",
      "/org/gnome/Hamster",
      function(p) {
        this.connId = p.connectSignal(
          "FactsChanged",
          this.onFactsChanged.bind(this)
        );
        this.onFactsChanged();
      }.bind(this)
    );
  }
  disable() {
    this.unsetTimer();
    if (this.proxy && this.connId) {
      this.proxy.disconnectSignal(this.connId);
      this.connId = 0;
    }
    this.proxy = null;
  }
  /**
   * Invoke the callback function, passing a string
   * with the activity name and the elapsed time
   * like "test 123 05:11" or the text "No activity".
   * Return true to keep the timer enabled.
   */
  trigger() {
    if (this.activity) {
      const truncated = this.activity.activity.length > 27
        ? this.activity.activity.substr(0, 27) + '…'
        : this.activity.activity;
      const time = this.formatTime(
        new Date() - this.activity.start
      );
      this.callback(
        `${truncated} ${time}`
      );
    } else {
      this.callback("No activity");
    }
    return true;
  }
  /**
   * Read and store the current activity, invoke the callback
   * and set the timer when an activity is running
   */
  async onFactsChanged() {
    this.activity = await this.getCurrentActivity();

    if (this.activity) {
      this.setTimer();
    } else {
      this.unsetTimer();
    }

    this.trigger();
  }
  /**
   * Return a promise with the current activity in the form:
   * {"activity":"test 123","start":"2020-11-26T13:22:00.000Z"}
   * or null if there is no current activity.
   */
  getCurrentActivity() {
    return new Promise( (resolve, reject) => {
      this.proxy.GetTodaysFactsJSONRemote(function([value], err) {
        if (err) reject(err);
        let last = value.pop();
        if (!last) resolve(null);
        last = JSON.parse(last);
        if (last.range.end == null) {
          resolve({
            activity: last.activity,
            start: new Date(last.range.start)
          });
        }
        resolve(null);
      });
    });
  }
  /**
   * Schedule an invokation of the trigger function every minute
   * in order to keep the elapsed time updated.
   */
  setTimer() {
    this.unsetTimer();
    //this.timer = setInterval(this.trigger, 1000 * 60);
    this.timer = GLib.timeout_add(
      GLib.PRIORITY_DEFAULT,
      1000 * 60,
      this.trigger.bind(this),
    );
  }
  unsetTimer() {
    if (this.timer) {
      //clearInterval(this.timer);
      GLib.Source.remove(this.timer);
      this.timer = null;
    }
  }
  /**
   * Convert an amount of milliseconds into a string in
   * the format mm:ss.
   * @example:
   *   formatTime(60 * 1000) => "00:01"
   */
  formatTime(ms) {
    const min_unit = 60*1000;
    const hours = Math.floor(ms / (min_unit*60));
    const minutes = Math.floor(ms % (min_unit*60) / min_unit);
    //return `${hours}:${minutes}`; // leading zeros missing
    return "%02d:%02d".format(hours, minutes);
  }
}

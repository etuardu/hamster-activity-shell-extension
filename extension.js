const {St, GLib, Clutter} = imports.gi;
const Main = imports.ui.main;
const Util = imports.misc.util;
const Mainloop = imports.mainloop;

const max_task_length = 25;

let panelButton, panelButtonText, timeout;

function setButtonText () {
    
  var arr = [];
  
  var [ok, out, err, exit] = GLib.spawn_command_line_sync('hamster current');

  var outString = out.toString().replace('\n', '');
  
  if (!isNaN(new Date(outString.substr(0, 16)))) {
    // we have a date in the first 16 chars, so there is an activity.
    // outString = '2020-11-16 17:21 bla bla bla@tag 00:00'

    outString = outString.substr(17); // remove the date
    var outArr = outString.split(" "); // convert to array
    var elapsedTime = outArr.pop(); // get the last element of the array
    var task = outArr.join(" "); // concatenate the other array elements
    task = (task.length > max_task_length) ?
      task.substr(0, max_task_length)+'…'
      : task; // truncate trask if too long
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
}

function enable () {
  Main.panel._rightBox.insert_child_at_index(panelButton, 1);
  timeout = Mainloop.timeout_add_seconds(10.0, setButtonText);
}

function disable () {
  Mainloop.source_remove(timeout);
  Main.panel._rightBox.remove_child(panelButton);
}

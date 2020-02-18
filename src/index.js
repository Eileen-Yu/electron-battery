import * as mb from "menubar";
import { Menu, powerMonitor } from "electron";
import { exec } from "child_process";
import { promisify } from "util";

const promiseExec = promisify(exec);

const UPDATE_INTERVAL = 10 * 1000;

const GET_REMAIN_TIME_COMMAND = `pmset -g batt | grep remaining | cut -d" " -f1,5`;

const batteryMenuBar = mb.menubar({
  tooltip: "Battery Remaining Time",
  icon: `${__dirname}/../iconTemplate.png`
});

async function getRemainingTime() {
  const { stderr, stdout } = await promiseExec(GET_REMAIN_TIME_COMMAND);
  if (stderr) throw new Error(`Failed to exec command on ${stderr}`);

  if (!/\d{1,2}:\d{1,2}/g.test(stdout) || /^\s0:00/.test(stdout)) return "";

  const [hour, minute] = stdout.trim().split(":");

  return `${hour}h${minute}m`;
}

async function updateValue() {
  try {
    const remainingTime = await getRemainingTime();
    batteryMenuBar.tray.setTitle(remainingTime);
  } catch (error) {
    console.error(error);
  }
}

const trayContextMenu = Menu.buildFromTemplate([
  {
    label: "Update",
    click: () => updateValue()
  },
  {
    label: "Quit",
    click: () => batteryMenuBar.app.quit()
  }
]);

function startMonitoring() {
  updateValue();
  return setInterval(updateValue, UPDATE_INTERVAL);
}

function stopMonitoring(intervalPid) {
  clearInterval(intervalPid);
}

batteryMenuBar.app.commandLine.appendSwitch(
  "disable-backgrounding-occluded-windows",
  "true"
);

batteryMenuBar.on("ready", () => {
  batteryMenuBar.tray.setContextMenu(trayContextMenu);

  let intervalPid = startMonitoring();

  powerMonitor.on("suspend", () => stopMonitoring(intervalPid));

  powerMonitor.on("resume", () => (intervalPid = startMonitoring()));
});

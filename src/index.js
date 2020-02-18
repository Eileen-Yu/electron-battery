import * as mb from "menubar";
import { Menu, powerMonitor } from "electron";
import { exec } from "child_process";
import { promisify } from "util";

const promiseExec = promisify(exec);

const UPDATE_INTERVAL = 10 * 1000;

const GET_REMAIN_TIME_COMMAND = `pmset -g batt | grep remaining | cut -d" " -f1,5`;

const batteryMenuBar = mb.menubar({
  tooltip: "Battery Remaining Time",
  icon: `${__dirname}/../icon.png`
});

async function getRemainingTime() {
  const { stderr, stdout } = await promiseExec(GET_REMAIN_TIME_COMMAND);
  if (stderr) throw new Error(`Failed to exec command on ${stderr}`);

  if (!/\d{1,2}:\d{1,2}/g.test(stdout) && /^\s0:00/.test(stdout)) return "";

  return stdout.trim();
}

function setRightClickMenu() {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Quit",
      click: () => batteryMenuBar.app.quit()
    }
  ]);

  batteryMenuBar.tray.on("right-click", () => {
    batteryMenuBar.tray.popUpContextMenu(contextMenu);
  });
}

async function updateValue() {
  try {
    const remainingTime = await getRemainingTime();
    batteryMenuBar.tray.setTitle(remainingTime);
  } catch (error) {
    console.error(error);
  }
}

function startMonitoring() {
  updateValue();
  return setInterval(() => updateValue(), UPDATE_INTERVAL);
}

function stopMonitoring(intervalPid) {
  clearInterval(intervalPid);
}

batteryMenuBar.on("ready", () => {
  batteryMenuBar.tray.on("click", () => {});
  batteryMenuBar.tray.on("double-click", () => {});

  setRightClickMenu();

  let intervalPid = startMonitoring();

  powerMonitor.on("suspend", () => stopMonitoring(intervalPid));

  powerMonitor.on("resume", () => (intervalPid = startMonitoring()));
});

# usage-meter

Shows how much of your Claude **Pro/Max** usage is left, right above the message box:

```
5h ██████░░░░ 62% · resets in 1h 40m   7d ██░░░░░░░░ 18% · resets in 3d 4h
```

- Green below 80%, yellow from 80%, red from 95%.
- `/usage-meter` opens a panel with the same lines. Use this on mobile, which has no room above the prompt.
- When a window crosses 80% or 95% you get a toast, plus a phone push notification where the session has the PushNotification tool (cloud / Remote Control sessions). Each threshold alerts once per window.

The numbers are the ones Anthropic's API reports with each reply, so the first reading shows up **after the first reply** of a session. On an API key there are no rate-limit windows, so nothing shows.

## Install on Claude Code Desktop (Mac/Windows)

1. Clone this repo somewhere permanent, e.g. `~/mods-repo`.
2. Add the plugin folder to `~/.claude/settings.json`:
   ```json
   {
     "env": {
       "CLAUDE_CODE_PLUGIN_DIRS": "~/mods-repo/mods/usage-meter"
     }
   }
   ```
   Merge it into your existing `env` block if you have one. On Windows use the full path, e.g. `C:\\Users\\you\\mods-repo\\mods\\usage-meter`.
3. Restart the Desktop app and send one message. The bar appears above the prompt.

From the terminal: `claude --plugin-dir ~/mods-repo/mods/usage-meter`.

## Check / test

```
claude plugin validate mods/usage-meter
claude plugin test mods/usage-meter
```

# Local Video Notes · Chinese Version

English | [中文](README.md)

A video annotation extension for YouTube and Bilibili that lets you capture highlights, mark clip start and end times, and add custom categories and notes as you watch. Click any timestamp to jump back to the moment, and export your notes to Excel to build an organized reference library for future video edits—so great clips don’t get forgotten.

Annotations stay in browser-local storage. No account or backend is required.

## Chinese / English

| Version | Folder | Language |
| --- | --- | --- |
| Chinese | `plain-version/` | Chinese interface, messages and fixed Excel headers |
| English | `english-version/` | English interface, messages and fixed Excel headers |

**This folder contains the Chinese Version.** Both versions have the same features, install independently, and allow UI customization. Each stores its data separately. Enable one at a time to avoid overlapping panels and shortcut conflicts. Before switching, export a backup and prepare it using the target version's template for import.

## Install and update

1. On GitHub, choose **Code → Download ZIP** and extract it, or clone the repository.
2. Open `chrome://extensions/` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the Chinese Version folder (this directory: `plain-version/`). The selected folder must directly contain `manifest.json`; do not select the ZIP itself.
5. Open or refresh a supported video page. The panel appears on the right.

After changing or updating files, click **Reload** for the extension and refresh the video page. No dependency installation or build step is required.

## Quick start

1. Play a video and click **Start** at the point you want to mark.
2. Enter an **Annotation**; this is required.
3. To mark a range, keep playing and click **End** at the final point. This does not pause playback.
4. Fill in any custom fields.
5. Click **Save** at the bottom of the annotation form. The record appears in the list and the panel collapses.
6. Click **Export XLSX** to download the current video's saved annotations.

Leave End time empty to save a single timestamp.

Chinese editions use equivalent Chinese button labels: 开始 (Start), 结束 (End), 保存 (Save), 取消 (Cancel), 修改/编辑 (Edit), 删除 (Delete), 清空 (Clear), 添加栏 (Add field).

## Features and operation

### Panel controls

- The rightmost header button expands or collapses the panel. Expanding directly also opens the complete form and initializes a new annotation at the current playback position.
- Collapsing and reopening retains the form currently being edited. Save before navigating to another video or refreshing the page.
- Drag an empty part of the header to move the panel; buttons do not initiate dragging.
- Drag the diagonal handle at the **top-left corner** to resize. Text scales within a limited range as the panel grows.
- Web fullscreen is supported by moving the panel into the fullscreen container. Behavior depends on the site's player.

### Start and end times

- **Start** creates an annotation if the form is closed. If the form is already open, it updates only Start time and preserves entered content.
- **End** updates only End time and does not pause playback. Open the form first.
- Both time fields can be edited manually. Use `mm:ss` or `h:mm:ss`, such as `02:35` or `1:05:09`, with valid minute/second components.
- End time is optional and may equal Start time, but cannot precede it. Saving and importing validate this.
- Captured playback positions are rounded to whole seconds.

### Text fields

1. Click **+ Add field** below the annotation and existing fields.
2. Select **Text**, then enter a unique name, such as “Personal thoughts”.
3. Click **Save** in the field editor.
4. Enter content in the new text box. Background color choices appear once it contains text.
5. Click **None**, Blue, Pink, Red, Green, Yellow or Purple. New text values default to no color. Different annotations can use different colors for the same field.
6. Click the annotation form's bottom **Save** button to save the record and its colors.

### Single-choice fields and option colors

1. Click **+ Add field** and select **Select (single choice)**.
2. Name the field, for example “Relationship”.
3. Enter an option name. Its adjacent color control defaults to **None**.
4. Click the small color control, then a color. The option name box previews that color and the palette closes.
5. Use **+ Add option** for additional options. Click **×** on a row to remove an option being edited.
6. Finish all options, then click **Save**. At least one option is required; names must be unique and nonempty.
7. Select an option using the radio buttons in the annotation form. Choose **None** to clear the choice. Each single-choice field accepts one option at a time.

### Edit and delete fields

- **Edit** and **Delete** sit next to each field title, without a separate duplicate field list.
- Edit opens that field's editor. Change its name, type, options or colors, then **Save**. **Cancel** discards the field edit.
- **Deleting a field takes effect immediately** and removes that field's values from existing records for the current video. Export anything you need to keep first.
- Changing a field's type clears its old values for the current video. Removing an option clears existing selections of that option.
- There is no configured field-count limit. Names must be unique, nonempty and different from the fixed export headers.
- All custom values are optional. Saved field definitions are reused for videos opened for the first time; existing videos keep their own configuration.
- **Save in the field editor** saves the field definition. **Save at the bottom of the annotation form** saves one annotation. They serve different purposes.

### Browse and manage records

- Records are sorted by start time and show the timestamp/range, annotation and filled custom values.
- Click a record's timestamp to seek to its start and play. Playback does not automatically stop at End time.
- Click **Edit** on a record, update it and save. Text colors are restored in the editor.
- Click **Delete** on a record and confirm to remove it.
- Click the top **Clear** button and confirm to remove every annotation for the current video; field definitions remain.
- **Cancel** in the annotation form abandons the current edit without deleting a saved record. Unsaved forms are not persisted automatically.

### Keyboard shortcuts

| Action | Windows / Linux | macOS |
| --- | --- | --- |
| Capture or adjust Start time | `Ctrl + Shift + .` | `Command + Shift + .` |
| Save annotation while focus is inside the panel | `Ctrl + Enter` | `Command + Enter` |
| Cancel annotation editing while focus is inside the panel | `Esc` | `Esc` |

The capture shortcut pauses a playing video when starting a new annotation and attempts to resume it after Save or Cancel. With an existing open form, it only updates Start time. The header Start/End buttons do not pause playback.

To change the shortcut, open the extension's **Options** page and choose **Open shortcut settings**, or visit `chrome://extensions/shortcuts`. Check for conflicts if the shortcut does not respond.

## Export XLSX

Click **Export XLSX** to download all saved records for the current video, sorted by start time. The filename uses the video title plus an annotation suffix.

| English fixed column | Chinese fixed column | Meaning |
| --- | --- | --- |
| Start time | 开始时间点 | Required timestamp |
| End time | 结束时间点 | Optional timestamp |
| Annotation | 批注内容 | Required text |

Custom columns follow in configured order, with your field names as headers. Selected option colors and per-record text background colors are exported to their cells. Times are written as text to avoid spreadsheet auto-conversion.

Files also carry field types, options and color metadata for re-import. Other spreadsheet software may remove this metadata when resaving a file. Data can still be imported using the required headers, but some types or colors may not be recoverable.

## Import XLSX and download a template

1. Click **Import XLSX**.
2. In the dialog, choose **OK** to select an existing file, or **Cancel** to download a blank template using the current fields.
3. Fill one annotation per row without changing the template headers; save it as `.xlsx`.
4. Import the file. Import **appends records**; it does not overwrite or deduplicate them.

English export/import headers:

```text
Start time | End time | Annotation | Custom fields…
```

Chinese editions require:

```text
开始时间点 | 结束时间点 | 批注内容 | 自定义列……
```

**Import an XLSX template downloaded from the edition you are using. Keep its headers and column order unchanged.** Format recognition uses only the first three fixed column headers: Start time, End time, Annotation (开始时间点, 结束时间点, 批注内容 in the Chinese editions). These are columns, not the first three records. Custom fields after them are read according to the template; user-written names and content are not translated.

Enter one record per row. End time may be blank; use `mm:ss` or `h:mm:ss`. Annotation is required and End time cannot precede Start time. Blank rows are ignored; invalid records are skipped with row numbers reported. Import appends records without automatic deduplication. Use an actual `.xlsx` file rather than renaming another format's extension.

**After importing into the extension, click any record's timestamp in the annotation list to jump directly to that start time and play the video.** Click the timestamp of the segment you want to review. Playback does not automatically stop at End time.

## Local storage, privacy and cleanup

- Records use `chrome.storage.local`, separately for each video. No backend, account system or cloud sync is included.
- The extension does not upload annotations. You control exported files and how they are shared.
- Exported records become eligible for cleanup after **3 days**, when the extension handles browser startup or installation events. This is not an exact-time scheduled deletion. Field definitions remain, and downloaded Excel files are not deleted.
- Adding, editing or deleting records, or changing field definitions, resets that video's exported flag. Export again to begin another cleanup period.
- A page-exit warning may appear for unexported records, depending on browser rules. It does not replace a backup.
- Uninstalling, clearing extension data or changing browser profiles can lose local records. Export important work regularly.
- Bilibili storage uses the BV/av video ID. Different parts of the same video currently share one record collection.

## Customize or redesign the UI

**The supplied UI is a starting point. You can redesign colors, typography, spacing, borders, controls and layout yourself.** Edit files in the edition you want to change; editions do not automatically share styling changes.

| File / code | Role | What to change |
| --- | --- | --- |
| `content.css` | In-page panel styling | Colors, typography, spacing, buttons, borders, layout, sizes and focus states |
| `content.js` → `root.innerHTML` | Main panel markup | Header, toolbar, time inputs and annotation form |
| `content.js` → `renderFields()` | Custom field rendering | Text boxes, radio options, title controls and text-color choices |
| `content.js` → `renderBuilder()` | Field editor | Field name/type, option rows, Save/Cancel layout |
| `content.js` → `paletteSelect()` / `colorChoices()` | Color controls | Small color trigger and color-choice appearance |
| `content.js` → `FIELD_COLORS` / `paletteNames` | Functional palette | Allowed colors and their names, including export colors |
| `content.js` → `updatePanelScale()` | Text scaling | Scale limits and base font size |
| `options.html` | Settings page | Settings markup and styling |
| `manifest.json` | Extension metadata and registration | Name, description, version, scripts, permissions and suggested shortcuts |
| `xlsx-lite-v2.js` | Active XLSX reader/writer | Export fonts, cell styles and workbook handling |
| `background.js` | Background logic | Shortcut dispatch and post-export cleanup |

For appearance-only changes, start with `content.css`. For example, append:

```css
#va-root {
  background: #f6f3ec;
  color: #181818;
  border: 1px solid #282828;
  border-radius: 4px;
}

#va-root .va-head {
  background: transparent;
  color: inherit;
}
```

Some color previews are set inline by `content.js`. For default uncolored surfaces or palette previews, also inspect `renderFields()`, `colorChoices()` and `paletteSelect()`. Avoid blanket `!important` rules that overwrite every user-selected color.

Preserve `.va-*` classes and `data-*` attributes when editing markup: event handling relies on them. Reload the extension and refresh the video page, then check panel controls, capture, field add/edit/delete, colors, dragging/resizing, fullscreen and XLSX import/export. UI changes require no server, API key or additional framework.

## Troubleshooting

**No panel?** Enable the intended edition, use a supported video page with a video player, and refresh after reloading the extension. Site player changes can affect detection.

**Two panels?** Disable the other editions.

**Errors after updating?** Refresh the video page to replace its old content script.

**Changes or colors not saved?** Save field definitions in the field editor, and annotation content/colors using the annotation form's Save button.

**Cannot open/import Excel?** Re-export with the current version. Use an actual `.xlsx` file with the correct header language; renaming a different format's extension is not conversion.

**Data missing after switching editions?** Storage is separate. Export from the original edition, import into the target edition, and check the header language.

## Development notes

Built with Chrome Manifest V3, vanilla JavaScript and CSS. `manifest.json` loads `xlsx-lite-v2.js`. Preview images and test scripts are not needed at runtime.

/* exported sheet, connectionSheet, settingsSheet, ui, cache, locale */

const sheet = SpreadsheetApp.getActive();
const connectionSheet = sheet.getSheetByName("Connection");
const settingsSheet = sheet.getSheetByName("Settings");
const ui = SpreadsheetApp.getUi();
const cache = CacheService.getScriptCache();
const locale = 'en_US';
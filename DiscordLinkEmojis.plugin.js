/**
 * @name LinkEmojis
 * @version 0.1
 * @description Link emojis[64px]
 * @author LordOfNightmares
 * @source https://github.com/LordOfNightmares/DiscordLinkEmojis
 * @updateUrl https://raw.githubusercontent.com/LordOfNightmares/DiscordLinkEmojis/main/DiscordLinkEmojis.plugin.js
 */

var LinkEmojis = (() => {

    'use strict';
    const description = {
        getName: () => "DiscordLinkEmojis",
        getShortName: () => "LinkEmojis",
        getDescription: () => "Link emojis[64px]",
        getVersion: () => "0.1",
        getAuthor: () => "LordOfNightmares",

        start: Start,
        stop: Stop
    }
    const BaseColor = "#0cf";

    var Discord;
    var Utils = {
        Log: (message) => { console.log(`%c[LinkEmojis] %c${message}`, `color:${BaseColor};font-weight:bold`, "") },
        Warn: (message) => { console.warn(`%c[LinkEmojis] %c${message}`, `color:${BaseColor};font-weight:bold`, "") },
        Error: (message) => { console.error(`%c[LinkEmojis] %c${message}`, `color:${BaseColor};font-weight:bold`, "") },
        Webpack: () => {
            let webpackExports;

            if (typeof BdApi !== "undefined" && BdApi?.findModuleByProps && BdApi?.findModule) {
                return { findModule: BdApi.findModule, findModuleByUniqueProperties: (props) => BdApi.findModuleByProps.apply(null, props) };
            }
            else if (Discord.window.webpackChunkdiscord_app != null) {
                Discord.window.webpackChunkdiscord_app.push([
                    ['__extra_id__'],
                    {},
                    req => webpackExports = req
                ]);
            }
            else if (Discord.window.webpackJsonp != null) {
                webpackExports = typeof (Discord.window.webpackJsonp) === 'function' ?
                    Discord.window.webpackJsonp(
                        [],
                        { '__extra_id__': (module, _export_, req) => { _export_.default = req } },
                        ['__extra_id__']
                    ).default :
                    Discord.window.webpackJsonp.push([
                        [],
                        { '__extra_id__': (_module_, exports, req) => { _module_.exports = req } },
                        [['__extra_id__']]
                    ]);
            }
            else return null;

            delete webpackExports.m['__extra_id__'];
            delete webpackExports.c['__extra_id__'];

            const findModule = (filter) => {
                for (let i in webpackExports.c) {
                    if (webpackExports.c.hasOwnProperty(i)) {
                        let m = webpackExports.c[i].exports;

                        if (!m) continue;

                        if (m.__esModule && m.default) m = m.default;

                        if (filter(m)) return m;
                    }
                }

                return null;
            };

            const findModuleByUniqueProperties = (propNames) => findModule(module => propNames.every(prop => module[prop] !== undefined));

            return { findModule, findModuleByUniqueProperties };
        }
    };

    var Initialized = false;
    var searchHook;
    var parseHook;
    var getEmojiUnavailableReasonHook;
    function Init() {
        Discord = { window: (typeof (unsafeWindow) !== 'undefined') ? unsafeWindow : window };

        const webpackUtil = Utils.Webpack();
        if (webpackUtil == null) { Utils.Error("Webpack not found."); return 0; }
        const { findModule, findModuleByUniqueProperties } = webpackUtil;

        let emojisModule = findModuleByUniqueProperties(['getDisambiguatedEmojiContext', 'searchWithoutFetchingLatest']);
        if (emojisModule == null) { Utils.Error("emojisModule not found."); return 0; }

        let messageEmojiParserModule = findModuleByUniqueProperties(['parse', 'parsePreprocessor', 'unparse']);
        if (messageEmojiParserModule == null) { Utils.Error("messageEmojiParserModule not found."); return 0; }

        let emojiPermissionsModule = findModuleByUniqueProperties(['getEmojiUnavailableReason']);
        if (emojiPermissionsModule == null) { Utils.Error("emojiPermissionsModule not found."); return 0; }

        searchHook = Discord.original_searchWithoutFetchingLatest = emojisModule.searchWithoutFetchingLatest;
        emojisModule.searchWithoutFetchingLatest = function () { return searchHook.apply(this, arguments); };

        parseHook = Discord.original_parse = messageEmojiParserModule.parse;
        messageEmojiParserModule.parse = function () { return parseHook.apply(this, arguments); };

        getEmojiUnavailableReasonHook = Discord.original_getEmojiUnavailableReason = emojiPermissionsModule.getEmojiUnavailableReason;
        emojiPermissionsModule.getEmojiUnavailableReason = function () { return getEmojiUnavailableReasonHook.apply(this, arguments); };


        Utils.Log("initialized");
        Initialized = true;

        return 1;
    }

    function Start() {
        if (!Initialized && Init() !== 1) return;

        const { original_parse, original_getEmojiUnavailableReason } = Discord;

        searchHook = function () {
            let result = Discord.original_searchWithoutFetchingLatest.apply(this, arguments);
            console.log({ result, arguments })
            result.unlocked.push(...result.locked);
            result.locked = [];
            return result;
        }

        function replaceEmoji(parseResult, emoji) {
            const emojiUrl = `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? "gif" : "webp"}`;
            parseResult.content = parseResult.content.replace(`<${emoji.animated ? "a" : ""}:${emoji.originalName || emoji.name}:${emoji.id}>`, emojiUrl + "?size=64");
        }

        parseHook = function () {
            let result = original_parse.apply(this, arguments);

            if (result.invalidEmojis.length !== 0) {
                for (let emoji of result.invalidEmojis) {
                    replaceEmoji(result, emoji);
                }
                result.invalidEmojis = [];
            }
            let validNonShortcutEmojis = result.validNonShortcutEmojis;
            for (let i = 0; i < validNonShortcutEmojis.length; i++) {
                const emoji = validNonShortcutEmojis[i];
                if (!emoji.available) {
                    replaceEmoji(result, emoji);
                    validNonShortcutEmojis.splice(i, 1);
                    i--;
                }
            }

            return result;
        };

        getEmojiUnavailableReasonHook = function () {
            return null;
        }
    }

    function Stop() {
        if (!Initialized) return;

        searchHook = Discord.original_searchWithoutFetchingLatest;
        parseHook = Discord.original_parse;
        getEmojiUnavailableReasonHook = Discord.original_getEmojiUnavailableReason;
    }

    return function () {
        return description
    };

})();

module.exports = LinkEmojis;

/*@end @*/

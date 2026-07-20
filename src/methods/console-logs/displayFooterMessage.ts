import { getLoggerForGuild } from "../../utils/logger";

export function displayFooterMessage(guildId: string, footer: string) {
    getLoggerForGuild(guildId).info({
        event: "footer_message",
        message: "Le message du Footer sera",
        content: footer
    });
}
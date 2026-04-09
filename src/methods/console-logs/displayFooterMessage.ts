import logger from "../../utils/logger";

export function displayFooterMessage(footer: string) {
    logger.info({
        event: "footer_message",
        message: "Le message du Footer sera",
        content: footer
    });
}
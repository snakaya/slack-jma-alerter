type JmaEntries = {
	[href: string]: number;
}

type SlackMessage = {
    text: string,
    attachments?: SlackAttachment[],
    webhook: string,
    channel: string
}

type SlackAttachment = {
    footer: string,
    ts: number,
    fields?: SlackAttachmentFields[],
    actions?: SlackAttachmentAction[],
    image_url?: string
}

type SlackAttachmentFields = {
    title: string,
    value: string
}
type SlackAttachmentAction = {
    type: string,
    text: string,
    url: string
}

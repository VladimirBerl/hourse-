const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])|(\bwww\.[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;

export const linkify = (text: string): string => {
    if (!text) return '';

    return text.replace(urlRegex, (url) => {
        let href = url;
        if (!href.match(/^(https?|ftp|file):\/\//i)) {
            href = 'http://' + href;
        }
        return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-brand-secondary hover:underline">${url}</a>`;
    });
};

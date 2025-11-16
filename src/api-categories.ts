
const WAIFU_PICS_SFW_CATEGORIES: string[] = [
    "waifu",
    "neko",
    "shinobu",
    "megumin",
    "bully",
    "cuddle",
    "cry",
    "hug",
    "awoo",
    "kiss",
    "lick",
    "pat",
    "smug",
    "bonk",
    "yeet",
    "blush",
    "smile",
    "wave",
    "highfive",
    "handhold",
    "nom",
    "bite",
    "glomp",
    "slap",
    "kill",
    "kick",
    "happy",
    "wink",
    "poke",
    "dance",
    "cringe",
];

const WAIFU_PICS_NSFW_CATEGORIES: string[] = [
    "waifu",
    "neko",
    "trap",
    "blowjob",
];

const WAIFU_IM_SFW_CATEGORIES: string[] = [
    "maid",
    "oppai",
];

const WAIFU_IM_NSFW_CATEGORIES: string[] = [
    "ass",
    "ecchi",
];

export function getRandomSFWCategory(provider: string): string {
    const categories = provider === 'waifu.pics' ? WAIFU_PICS_SFW_CATEGORIES : WAIFU_IM_SFW_CATEGORIES;
    const idx = Math.floor(Math.random() * categories.length);
    return categories[idx];
}

export function getRandomNSFWCategory(provider: string): string {
    const categories = provider === 'waifu.pics' ? WAIFU_PICS_NSFW_CATEGORIES : WAIFU_IM_NSFW_CATEGORIES;
    const idx = Math.floor(Math.random() * categories.length);
    return categories[idx];
}
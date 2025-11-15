
const SFW_CATEGORIES: string[] = [
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

const NSFW_CATEGORIES: string[] = [
    "waifu",
    "neko",
    "trap",
    "blowjob",
];

export function getRandomSFWCategory(): string {
    const idx = Math.floor(Math.random() * SFW_CATEGORIES.length);
    return SFW_CATEGORIES[idx];
}

export function getRandomNSFWCategory(): string {
    const idx = Math.floor(Math.random() * NSFW_CATEGORIES.length);
    return NSFW_CATEGORIES[idx];
}
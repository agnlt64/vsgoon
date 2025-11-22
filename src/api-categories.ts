import * as vscode from 'vscode';
export type Provider = 'waifu.pics' | 'waifu.im';

export function getRandomSFWCategory(config: vscode.WorkspaceConfiguration): string {
    const provider = config.get<Provider>('provider', 'waifu.pics');
    const waifuPicsCategories = config.get<string[]>('waifuPicsCategories.sfw', []);
    const waifuImCategories = config.get<string[]>('waifuImCategories.sfw', []);

    const categories = provider === 'waifu.pics' ? waifuPicsCategories : waifuImCategories;
    const idx = Math.floor(Math.random() * categories.length);
    return categories[idx];
}

export function getRandomNSFWCategory(config: vscode.WorkspaceConfiguration): string {
    const provider = config.get<Provider>('provider', 'waifu.pics');
    const waifuPicsCategories = config.get<string[]>('waifuPicsCategories.nsfw', []);
    const waifuImCategories = config.get<string[]>('waifuImCategories.nsfw', []);

    const categories = provider === 'waifu.pics' ? waifuPicsCategories : waifuImCategories;
    const idx = Math.floor(Math.random() * categories.length);
    return categories[idx];
}
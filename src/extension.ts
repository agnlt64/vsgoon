import * as vscode from 'vscode';
import * as fs from 'fs';
import { getRandomNSFWCategory, getRandomSFWCategory } from './api-categories';

type WaifuPicsApiResponse = {
	url?: string;
	files?: string[];
}

type WaifuIMApiResponse = {
	images: { url: string }[];
}

type Provider = 'waifu.pics' | 'waifu.im';

function getClientCode(context: vscode.ExtensionContext, image: vscode.Uri, category: string): string {
	try {
		const path = vscode.Uri.joinPath(context.extensionUri, 'media', 'client.html');
		let data = fs.readFileSync(path.fsPath, 'utf8');
		data = data.replace('${imageUrl}', image.toString());
		data = data.replace('${category}', category);
		return data;
	} catch (err) {
		console.error('Error reading client.html:', err);
		return "";
	}
}

class GoonImageProvider implements vscode.WebviewViewProvider {
	private apiUrl: URL;
	private images: vscode.Uri[] = [];
	private category: string = '';
	private lastIdx: number = 0;
	private view?: vscode.WebviewView;

	constructor(private readonly context: vscode.ExtensionContext) {
		const config = this.getConfig();
		const provider = config.get<Provider>('provider', 'waifu.pics');
		this.apiUrl = new URL(`https://api.${provider}/`);
	}

	private getConfig() {
		return vscode.workspace.getConfiguration('vsgoon');
	}

	private updateURL() {
		const config = this.getConfig();
		const provider = config.get<Provider>('provider', 'waifu.pics');
		const allowNSFW = config.get<boolean>('allowNSFW', false);
		const autoRefresh = config.get<boolean>('autoRefresh', true);
		
		this.apiUrl.host = `api.${provider}`;
		this.category = allowNSFW ? getRandomNSFWCategory(provider) : getRandomSFWCategory(provider);
		// Build pathname
		if (provider === 'waifu.pics') {
			const mode = autoRefresh ? '/many' : '';
			const rating = allowNSFW ? '/nsfw' : '/sfw';
			
			this.apiUrl.pathname = `${mode}${rating}/${this.category}`;
		} else if (provider === 'waifu.im') {
			this.apiUrl.pathname = '/search';
			this.apiUrl.searchParams.set('included_tags', this.category);
			if (autoRefresh) {
				this.apiUrl.searchParams.set('limit', '30');
			}
		} else {
			console.error(`Unknown provider: ${provider}`);
		}
		console.log(`Updated API URL to: ${this.apiUrl.toString()}`);
	}

	private async fetchImages() {
		try {
			console.log(`Fetching images from ${this.apiUrl}...`);
			const config = this.getConfig();
			const provider = config.get<Provider>('provider', 'waifu.pics');
			const autoRefresh = config.get<boolean>('autoRefresh', true);
			
			if (provider === 'waifu.pics') {
				const response = autoRefresh
					? await fetch(this.apiUrl, {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ exclude: [] }),
						})
					: await fetch(this.apiUrl);
	
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}
	
				const data = await response.json() as WaifuPicsApiResponse;

				this.images = data.files 
				? data.files.map(file => vscode.Uri.parse(file))
				: data.url ? [vscode.Uri.parse(data.url)] : [];
			} else if (provider === 'waifu.im') {
				const response = await fetch(this.apiUrl);
				const data = await response.json() as WaifuIMApiResponse;

				this.images = data.images
				? data.images.map(img => vscode.Uri.parse(img.url))
				: [];
			}
		} catch (error) {
			console.error('Error fetching images:', error);
			this.images = [];
		}
	}

	private async getNextImage(): Promise<vscode.Uri | undefined> {
		if (this.images.length === 0) {
			await this.fetchImages();
		}

		if (this.images.length === 0) {
			console.error('No images available');
			return undefined;
		}

		const currentImage = this.images[this.lastIdx];
		this.lastIdx = (this.lastIdx + 1) % this.images.length;

		if (this.lastIdx === 0) {
			// We've cycled through all images, fetch more
			await this.fetchImages();
		}

		return currentImage;
	}

	private getRefreshDelay(): number {
		const config = this.getConfig();
		const autoRefresh = config.get<boolean>('autoRefresh', true);
		const refreshDelay = config.get<number>('refreshDelay', 5);
		return autoRefresh ? refreshDelay : -1;
	}

	private async sendImageUpdate(image: vscode.Uri | undefined) {
		if (this.view && image) {
			this.view.webview.postMessage({
				command: 'updateImage',
				imageUrl: image.toString(),
				category: this.category,
				refreshDelay: this.getRefreshDelay()
			});
		}
	}

	private async handleImageRequest() {
		const nextImage = await this.getNextImage();
		if (nextImage) {
			await this.sendImageUpdate(nextImage);
		}
	}

	private async handleCategoryRequest() {
		this.updateURL();
		await this.fetchImages();
		await this.handleImageRequest();
	}

	public async updateSettings() {
		this.updateURL();
		await this.fetchImages();
		await this.handleImageRequest();
	}

	public async resolveWebviewView(webviewView: vscode.WebviewView) {
		webviewView.webview.options = { enableScripts: true };
		this.view = webviewView;

		this.updateURL();
		await this.fetchImages();

		const firstImage = await this.getNextImage();
		if (!firstImage) {
			console.error('Failed to load initial image');
			return;
		}

		webviewView.webview.html = getClientCode(this.context, firstImage, this.category);
		
		// Send initial settings after webview loads
		setTimeout(async () => {
			await this.sendImageUpdate(firstImage);
		}, 100);
		
		// Handle messages from the webview
		webviewView.webview.onDidReceiveMessage(async message => {
			switch (message.command) {
				case 'getNextImage':
				case 'requestNewImage':
					await this.handleImageRequest();
					break;
				case 'requestNewCategory':
					await this.handleCategoryRequest();
					break;
			}
		});
	}
}

export function activate(context: vscode.ExtensionContext) {
	const provider = new GoonImageProvider(context);
	
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('goonView', provider),
		vscode.workspace.onDidChangeConfiguration(event => {
			if (event.affectsConfiguration('vsgoon')) {
				provider.updateSettings();
			}
		})
	);
}

export function deactivate() {}

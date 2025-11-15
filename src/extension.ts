import * as vscode from 'vscode';
import * as fs from 'fs';

type ApiResponse = {
	url?: string;
	files?: string[];
}

type Settings = {
	allowNSFW: boolean;
	autoRefresh: boolean;
}

function getClientCode(context: vscode.ExtensionContext, image: vscode.Uri): string {
	try {
		const path = vscode.Uri.joinPath(context.extensionUri, 'media', 'client.html');
		let data = fs.readFileSync(path.fsPath, 'utf8');
		data = data.replace('${imageUrl}', image.toString());
		return data;
	} catch (err) {
		console.error('Error reading client.html:', err);
		return "";
	}
}

class GoonImageProvider implements vscode.WebviewViewProvider {
	private apiUrl: URL;
	private images: vscode.Uri[];
	private lastIdx: number = 0;
	private view?: vscode.WebviewView;
	private settings: Settings;

	constructor(private readonly context: vscode.ExtensionContext) {
		this.images = [];
		this.apiUrl = new URL('/many/sfw/smile', 'https://api.waifu.pics/');
		this.settings = this.getSettings();
	}

	private getSettings(): Settings {
		return this.context.globalState.get('vsgoon.settings', {
			allowNSFW: false,
			autoRefresh: true
		});
	}

	private async saveSettings(settings: Settings) {
		this.settings = settings;
		await this.context.globalState.update('vsgoon.settings', settings);
	}

	private  updateURL(settings: Settings) {
		if (settings.autoRefresh) {
			this.apiUrl.pathname = '/many';
			if (settings.allowNSFW) {
				this.apiUrl.pathname += '/nsfw';
			} else {
				this.apiUrl.pathname += '/sfw';
			}
		} else {
			if (settings.allowNSFW) {
				this.apiUrl.pathname = '/nsfw';
			} else {
				this.apiUrl.pathname = '/sfw';
			}
		}
		console.log(this.apiUrl.toString());
	}

	private async fetchManyImages() {
		console.log('Fetching many images from API...');
		const res = await fetch(this.apiUrl,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ exclude: [] })
			}
		);
		const data = await res.json() as ApiResponse;
		this.images = (data.files || []).map(file => vscode.Uri.parse(file));
	}

	private async getNextImage(): Promise<vscode.Uri> {
		this.lastIdx = (this.lastIdx + 1) % this.images.length;
		const nextImage = this.images[this.lastIdx];

		if (this.lastIdx === this.images.length - 1) {
			await this.fetchManyImages();
			this.lastIdx = -1; // will be set to 0 on next call
		}

		return nextImage;
	}

	private async getHtmlForWebview(webview: vscode.Webview) {
		const image = await this.getNextImage();
		const clientCode = getClientCode(this.context, image);
		return clientCode;
	}

	async resolveWebviewView(webviewView: vscode.WebviewView) {
		webviewView.webview.options = {
			enableScripts: true,
		};
		this.view = webviewView;
		// initial fetch
		await this.fetchManyImages();
		
		webviewView.webview.html = await this.getHtmlForWebview(webviewView.webview);
		
		// Handle messages from the webview
		webviewView.webview.onDidReceiveMessage(async message => {
			if (message.command === 'getNextImage') {
				const nextImage = await this.getNextImage();
				webviewView.webview.postMessage({ command: 'updateImage', imageUrl: nextImage.toString() });
			} else if (message.command === 'updateSettings') {
				const settings: Settings = {
					allowNSFW: message.allowNsfw,
					autoRefresh: message.autoRefresh
				};
				await this.saveSettings(settings);
				this.updateURL(settings);
				vscode.window.showInformationMessage('Settings have been updated!');
			} else if (message.command === 'getSettings') {
				webviewView.webview.postMessage({ 
					command: 'restoreSettings', 
					allowNsfw: this.settings.allowNSFW,
					autoRefresh: this.settings.autoRefresh
				});
			}
		});
	}

	async revealSettings() {
		if (this.view) {
			this.view.webview.postMessage({ command: 'openSettings' });
		} 
	}
}

export function activate(context: vscode.ExtensionContext) {
	const provider = new GoonImageProvider(context);
	
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			'goonView', provider
		)
	);

	context.subscriptions.push(
        vscode.commands.registerCommand("vsgoon.openSettings", () => {
            provider.revealSettings();
        })
    );
}

export function deactivate() {}

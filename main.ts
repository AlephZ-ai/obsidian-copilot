import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, ItemView, WorkspaceLeaf } from 'obsidian';

const CoPilotViewType: string = 'chat-view';
const CoPilotViewDescription: string = 'Chat';

class CoPilotView extends ItemView {
	public getViewType(): string {
		return CoPilotViewType;
	}

	public getDisplayText(): string {
		return CoPilotViewDescription;
	}
}

interface CoPilotChatSettings {
	apiEndpoint: string;
	defaultGreeting: string;
	enableTimestamps: boolean;
	chatTheme: 'light' | 'dark'; 
}

const DEFAULT_SETTINGS: CoPilotChatSettings = {
	apiEndpoint: 'https://api.openai.com/v1/engines/davinci-codex/completions',
	defaultGreeting: 'Hello, how can I help you today?',
	enableTimestamps: true,
	chatTheme: 'dark'
};

export default class MyPlugin extends Plugin {
	settings: CoPilotChatSettings;

	async onload() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		this.registerView(CoPilotViewType, (leaf: WorkspaceLeaf) => new CoPilotView(leaf));
		this.addSettingTab(new CoPilotSettingTab(this.app, this));
		// We add CoPilotSettingTab and then will need to create a class for this ***
		this.addRibbonIcon('message-circle', 'Open Chat', async ()=> {
			let leaf = this.app.workspace.activeLeaf;
			if (!leaf) {
				leaf = this.app.workspace.splitActiveLeaf();
			}
			await leaf.setViewState({
				type: CoPilotViewType
			});
		}
		async onunload() {
			/// Cleanup
		}
}}

import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, ItemView, WorkspaceLeaf } from "obsidian";

const CoPilotViewType: string = "chat-view";
const CoPilotViewDescription: string = "Chat";

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
	chatTheme: "light" | "dark"; 
}

const DEFAULT_SETTINGS: CoPilotChatSettings = {
	apiEndpoint: "https://api.openai.com/v1/engines/davinci-codex/completions",
	defaultGreeting: "Hello, how can I help you today?",
	enableTimestamps: true,
	chatTheme: "dark"
};

export default class MyPlugin extends Plugin {
	settings: CoPilotChatSettings;
	removeRibbonIcon: any;
	deregisterView: any;

	async onload() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		this.deregisterView = this.registerView(CoPilotViewType, (leaf: WorkspaceLeaf) => new CoPilotView(leaf));
		this.addSettingTab(new CoPilotSettingTab(this.app, this));
		this.removeRibbonIcon = this.addRibbonIcon("message-circle", "Open Chat", async () => {
			let leaf = this.app.workspace.getLeaf();
			if (!leaf) {
				leaf = this.app.workspace.getLeaf(true);
			}
			await leaf.setViewState({
				type: CoPilotViewType
			});
		});
		console.log("Plugin Loaded!");
	}

		
	async onunload() {
		if (this.removeRibbonIcon) {
			this.removeRibbonIcon();
		}
		if (this.deregisterView) {
			this.deregisterView();
		}
		await this.saveData(this.settings);
		console.log("Plugin unloaded!")
}
	
	async saveSettings() {
		await this.saveData(this.settings);
	}}
class CoPilotSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
		.setName ("API Endpoint")
		.setDesc("Enter the API Endpoint for the chat.")
		.addText(text => text
			.setPlaceholder("Enter API Endpoint")
			.setValue(this.plugin.settings.apiEndpoint)
			.onChange(async (value) => {
				this.plugin.settings.apiEndpoint = value;
				await this.plugin.saveSettings();
			}));
		
		new Setting(containerEl)
		.setName("Chat Theme")
		.setDesc("Choose the theme for the chat interface.")
		.addDropdown(Dropdown => Dropdown
			.addOption("light", "Light")
			.addOption("dark", "Dark")
			.setValue(this.plugin.settings.chatTheme)
			.onChange(async (value) => {
				this.plugin.settings.chatTheme = value as "light" | "dark";
				await this.plugin.saveSettings();
			})
		);
		
		new Setting(containerEl)
		.setName("Default Greeting")
		.setDesc("Enter the default greeting message.")
		.addText(text => text
			.setPlaceholder("Enter default greeting")
			.setValue(this.plugin.settings.defaultGreeting)
			.onChange(async (value) => {
				this.plugin.settings.defaultGreeting = value;
				await this.plugin.saveSettings();
			}));

		new Setting(containerEl)
		.setName("Enable Timestamps")
		.setDesc("Toggle to enable or disable timestamps in the chat.")
		.addToggle(toggle => toggle
			.setValue(this.plugin.settings.enableTimestamps)
			.onChange(async (value) => {
				this.plugin.settings.enableTimestamps = value;
				await this.plugin.saveSettings();
			}));
			console.log("Settings Loaded!");
	}
}

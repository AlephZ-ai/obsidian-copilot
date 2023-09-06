import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, ItemView, WorkspaceLeaf } from "obsidian";
import axios from "axios";

const CoPilotViewDescription = "Chat";
interface CoPilotChatSettings {
	apiKey: string;
	defaultGreeting: string;
	enableTimestamps: boolean;
	chatTheme: "light" | "dark"; 
}

const DEFAULT_SETTINGS: CoPilotChatSettings = {
	apiKey: "",
	defaultGreeting: "Hello, how can I help you today?",
	enableTimestamps: true,
	chatTheme: "dark"
};

export default class MyPlugin extends Plugin {
	settings: CoPilotChatSettings;

	async onload() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		this.addSettingTab(new CoPilotSettingTab(this.app, this));
		this.addRibbonIcon("message-circle", "Open Chat", () => {
			this.toggleSidebar();
		});
	console.log("Plugin Loaded!");
	}

	toggleSidebar() {
		const leaf = this.app.workspace.getRightLeaf(false);
		if(leaf.view.getViewType() === 'chat-panel') {
			leaf.setViewState({type: "empty"});
		} else {
			this.initializeSidebar();
		}}

	initializeSidebar() {
		const leaf = this.app.workspace.getRightLeaf(true);
		leaf.setViewState({
			type: "chat-panel",
		});
		new CoPilotSidebar(this.app, leaf.view.containerEl, this.settings);
	}

	async onunload() {
		await this.saveData(this.settings);
		console.log("Plugin unloaded!")
}
	
	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class CoPilotSidebar {
	app: App;
	container: HTMLElement;
	messagesDiv: HTMLDivElement;
	inputElement: HTMLInputElement;
	chatHistory: HTMLElement;
	settings: CoPilotChatSettings;

	constructor (app: App, container: HTMLElement, settings: CoPilotChatSettings) {
		this.app = app;
		this.container = container;
		this.settings = settings;
		this.messagesDiv = this.container.createDiv({ cls: "messages" })
		this.inputElement = this.container.createEl("input", { type: "text", placeholder: "Type your message..."}) as HTMLInputElement;
		this.inputElement.addEventListener("keydown", (event: KeyboardEvent) => {
			if (event.code === "Enter") {
				this.sendMessages(this.inputElement.value);
				this.inputElement.value = "";
			}
		this.chatHistory = this.container.createEl("div", { "cls": "chat-history" });	
		});
	}

	/// Ignore sendMessages (Incomplete)
	async sendMessages(message: string) {
		const userMessageDiv = this.chatHistory.createEl("div", { "cls": "user-message" });
		userMessageDiv.setText("User: ${message}");
		const apiEndpoint = "https://api.openai.com/v1/chat/completions"
		const apiKey = this.settings.apiKey
	}
}
class CoPilotSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
		.setName ("API Key")
		.setDesc("Enter your API Key from openai.com")
		.addText(text => text
			.setPlaceholder("Enter API Key")
			.setValue(this.plugin.settings.apiKey)
			.onChange(async (value) => {
				this.plugin.settings.apiKey = value;
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

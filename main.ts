/* eslint-disable prefer-const */
import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, ItemView, WorkspaceLeaf, TFile } from 'obsidian';
import axios from 'axios'


interface CoPilotChatSettings {
	apiKey: string;
	defaultGreeting: string;
	enableTimestamps: boolean;
	chatTheme: 'light' | 'dark';
	chatSessions: Array<Array<string>>; 
}

const DEFAULT_SETTINGS: CoPilotChatSettings = {
	apiKey: '',
	defaultGreeting: 'Hello, how can I help you today?',
	enableTimestamps: true,
	chatTheme: 'dark',
	chatSessions: []
};

export default class MyPlugin extends Plugin {
	settings: CoPilotChatSettings;
	activeSidebar: CoPilotSidebar | null = null

	async onload() {
		const appInstance: App = this.app;
		const activeMarkdownView = appInstance.workspace.getActiveViewOfType(MarkdownView);
		if (activeMarkdownView) {
			console.log("Active Markdown view found!");
		} else {
			console.log("No Active Markdown view found!");
		}
		const leaf = appInstance.workspace.getLeaf();
		if (leaf) {
		const fileToOpen = appInstance.vault.getAbstractFileByPath("path/to/your/file.md AUTOMATE")
		if (fileToOpen instanceof TFile && fileToOpen.extension === "md") {
		leaf.openFile(fileToOpen);
	}
}
		this.settings = { ...DEFAULT_SETTINGS, ...await this.loadData() };
		this.addSettingTab(new CoPilotSettingTab(this.app, this));
		this.addRibbonIcon('message-circle', 'Open Chat', () => {
			this.toggleSidebar();});
	console.log('Plugin Loaded!');
	}

	toggleSidebar() {
		const leaf = this.app.workspace.getRightLeaf(false);
		if(leaf.view.getViewType() === 'chat-panel') {
			if (this.activeSidebar) {
				this.activeSidebar.saveCurrentSession();
			}
			leaf.setViewState({type: 'empty'});
		} else {
			this.initializeSidebar();
		}}

	initializeSidebar() {
		const leaf = this.app.workspace.getRightLeaf(true);
		leaf.setViewState({
			type: 'chat-panel',
		});
		
		this.activeSidebar = new CoPilotSidebar(this.app, leaf.view.containerEl, this.settings, this);
		
	}

	async onunload() {
		await this.saveData(this.settings);
		console.log('Plugin unloaded!')
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
	chatSessions: Array<Array<string>>;
	currentSession: Array<string>;
	sessionDropdown: HTMLSelectElement;
	plugin: MyPlugin;

	constructor (app: App, container: HTMLElement, settings: CoPilotChatSettings, plugin: MyPlugin) {
		this.app = app;
		this.container = container;
		this.settings = settings;
		this.plugin = plugin;
		
		this.chatHistory = this.container.createEl('div', { 'cls': 'chat-history' });
		this.chatSessions = settings.chatSessions || [];
		this.currentSession = []
		this.sessionDropdown = this.container.createEl('select') as HTMLSelectElement;
		const defaultOption = document.createEl('option');
		defaultOption.value = '-1'
		defaultOption.text = 'Choose Previous Chat Session';
		this.sessionDropdown.appendChild(defaultOption);

		this.sessionDropdown.addEventListener('change', ()=> {
			this.loadChatSession(Number(this.sessionDropdown.value));
		this.applyChatTheme();
		this.displayDefaultGreeting();
		});
		
		
		this.messagesDiv = this.container.createDiv({ cls: 'messages' })
		this.inputElement = this.container.createEl('input', { type: 'text', placeholder: 'Type your message...'}) as HTMLInputElement;
		this.inputElement.addEventListener('keydown', (event: KeyboardEvent) => {
			if (event.code === 'Enter') {
				this.handleEditorInteraction(this.inputElement.value);
				this.inputElement.value = '';
			}	
		});
	}

	async sendMessages(message: string): Promise<string | null> {
		const timestamp = this.settings.enableTimestamps ? `[${this.getTimestamp()}]` : '';
		const userMessageDiv = this.chatHistory.createEl('div', { 'cls': 'user-message' });
		userMessageDiv.setText(`${timestamp}User: ${message}`);
		
		const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeLeaf) {
			const editor = activeLeaf.editor;
			const selectedText = editor.getSelection();

			if (selectedText) {
				message = `${message} [Selected Text: ${selectedText}]`;
			}
		}

		let gptMessage = '';
		
		const apiEndpoint = 'https://api.openai.com/v1/chat/completions'
		const apiKey = this.settings.apiKey

		const headers = {
			'Authorization': `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		};

		const body = {
			prompt: message,
			max_tokens: 150
		};

		try {
			const response = await axios.post(apiEndpoint, body, { headers: headers });
			if (response && response.data && response.data.choices && response.data.choices.length > 0) {
				const gptMessage = response.data.choices[0].text.trim();

				const gptMessageDiv = this.chatHistory.createEl('div', { 'cls': 'gpt-message' });	
				gptMessageDiv.setText(`${timestamp}GPT: ${gptMessage}` );

				this.currentSession.push(`User: ${message}`);
				this.currentSession.push(`GPT: ${gptMessage}`);

				return gptMessage;
				
			} else {
				console.error("GPT-3 response format was unexpected.")
			}
		} catch (error) {
			console.error('Error fetching GPT response:', error);

			let errorMessage: string;
				
			if (error instanceof Error) {
				errorMessage = error.message;
			} else {
				errorMessage = "An unexpected error occurred."
			}

			if (error.response) {
				if (error.response.status === 429) {
					errorMessage = 'Error: Rate limit reached. Please try again later.';
				} else if (error.response.status === 403) {
					errorMessage = 'Error: Invalid API key or insufficient permissions.';
				} else if (error.response.status >= 500) {
					errorMessage = 'Error: Server error at OpenAI. Please try again later.';
				} else {
					errorMessage = `Error: ${error.response.data?.error || 'Unexpected Error'}`;
				}
			} else if (error.request) {
				errorMessage = 'Error: No response received. Please check your internet connection.';
			} else {
				errorMessage = `Error: ${error.message}`;
			}

			console.error(errorMessage)

			const errorMessagediv = this.chatHistory.createEl('div', { 'cls': 'error-message' });
			errorMessagediv.setText('Error: Failed to get a response')

			return null;
		}

		this.currentSession.push(`User: ${message}`);
		this.currentSession.push(`GPT: ${gptMessage}`);
	}
	
	loadChatSession(SelectedIndex: number) {
		if (SelectedIndex >= 0 && SelectedIndex < this.chatSessions.length) {
			const selectedSession = this.chatSessions[SelectedIndex];
			this.chatHistory.innerHTML = '';
			selectedSession.forEach(message => {
				const messageDiv = this.chatHistory.createEl('div');
				messageDiv.textContent = message;
			});
		}
	}

	saveCurrentSession() {
		if (this.currentSession.length) {
			this.chatSessions.push(this.currentSession);

			if (this.chatSessions.length > 5) {
				this.chatSessions.shift();
			}

			this.updateChatSessionDropdown();

			this.currentSession = [];

			this.plugin.settings.chatSessions = this.chatSessions;
			this.plugin.saveSettings();
		}
	}

	updateChatSessionDropdown() {
		while (this.sessionDropdown.options.length > 1) {
			this.sessionDropdown.remove(1);
		}
		this.chatSessions.forEach((session, index) => {
			const option = document.createElement('option');
			option.value = index.toString();
			option.text = `Chat Session ${index + 1}`;
			this.sessionDropdown.appendChild(option);
		})
	}

	applyChatTheme() {
		const theme = this.settings.chatTheme
		if (theme === 'light') {
			this.messagesDiv.classList.add('light');
			this.messagesDiv.classList.remove('dark');
		} else if (theme === 'dark') {
			this.messagesDiv.classList.add('dark');
			this.messagesDiv.classList.remove('light');
		}
	}

	displayDefaultGreeting() {
		const greetingDiv = this.chatHistory.createEl('div', { 'cls': 'gpt-message' });
		greetingDiv.setText(`GPT: ${this.settings.defaultGreeting}`);
	}

	getTimestamp(): string {
		const date = new Date();
		return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
	}

	clearChatSessions() {
		this.chatSessions = [];
		this.currentSession = [];
		this.updateChatSessionDropdown();
		this.chatHistory.innerHTML = '';
	}

	async handleEditorInteraction(message: string) {
		const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
		
		if (!activeLeaf) return;

		const editor = activeLeaf.editor;
		const selectedText = editor.getSelection();

		let modifiedMessage = message;
		
		if (selectedText) {
			modifiedMessage = `${message} [Selected Text: ${selectedText}]`;
		}

		const gptResponse = await this.sendMessages(modifiedMessage);

		if (gptResponse) {

		if (message.toLowerCase().includes("highlight")) {
			editor.replaceSelection(`==${selectedText}==`);
		} else if (message.toLowerCase().includes("replace") &&  gptResponse) {
			editor.replaceSelection(gptResponse);
		} else if (message.toLowerCase().includes("insert") && gptResponse) {
			const cursorPosition = editor.getCursor();
			editor.replaceRange(gptResponse, cursorPosition);
		}

		this.sendMessages(message);
}}}
class CoPilotSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		new Setting(containerEl)
		.setName ('API Key')
		.setDesc('Enter your API Key from openai.com')
		.addText(text => text
			.setPlaceholder('Enter API Key')
			.setValue(this.plugin.settings.apiKey)
			.onChange(async (value) => {
				this.plugin.settings.apiKey = value;
				await this.plugin.saveSettings();
			}));
		
		new Setting(containerEl)
		.setName('Chat Theme')
		.setDesc('Choose the theme for the chat interface.')
		.addDropdown(Dropdown => Dropdown
			.addOption('light', 'Light')
			.addOption('dark', 'Dark')
			.setValue(this.plugin.settings.chatTheme)
			.onChange(async (value) => {
				this.plugin.settings.chatTheme = value as 'light' | 'dark';
				await this.plugin.saveSettings();

				if (this.plugin.activeSidebar) {
					this.plugin.activeSidebar.applyChatTheme();
				}
			})
		);
		
		new Setting(containerEl)
		.setName('Default Greeting')
		.setDesc('Enter the default greeting message.')
		.addText(text => text
			.setPlaceholder('Enter default greeting')
			.setValue(this.plugin.settings.defaultGreeting)
			.onChange(async (value) => {
				this.plugin.settings.defaultGreeting = value;
				await this.plugin.saveSettings();
			}));

		new Setting(containerEl)
		.setName('Enable Timestamps')
		.setDesc('Toggle to enable or disable timestamps in the chat.')
		.addToggle(toggle => toggle
			.setValue(this.plugin.settings.enableTimestamps)
			.onChange(async (value) => {
				this.plugin.settings.enableTimestamps = value;
				await this.plugin.saveSettings();
			}));

		new Setting(containerEl)
		.setName('Clear Chat Sessions')
		.setDesc('Clear all saved chat sessions')
		.addButton(button => button
			.setButtonText('Clear Sessions')
			.onClick(async () => {
				if (this.plugin.activeSidebar) {
					this.plugin.activeSidebar.clearChatSessions();
				}
				this.plugin.settings.chatSessions = [];
				await this.plugin.saveSettings();

				new Notice('All saved chat sessions have been cleared');
			}));
			console.log('Settings Loaded!');
	}
}

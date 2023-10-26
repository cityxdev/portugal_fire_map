import {UIElement} from "./ui";
import '../../css/ui/tabs.css';

class TabsElement extends UIElement {
    constructor(translator, isMobileDevice, elementCode, tabCodes, tabNames, tabContents) {
        super(elementCode, translator);
        this.isMobileDevice = isMobileDevice;
        this.elementCode = elementCode;
        this.tabCodes = tabCodes;
        this.tabNames = tabNames;
        this.tabContents = tabContents;

        this.tabs = [];
        this.tabPanels = [];
        for (let i = 0; i < this.tabCodes.length; i++) {
            const tabPanel = new TabPanel(this.translator, this.isMobileDevice, this.elementCode, this.tabCodes[i], this.tabContents[i]);
            this.tabPanels.push(tabPanel);
            const tab = new Tab(this.translator, this.isMobileDevice, this.elementCode, this.tabCodes[i], this.tabNames[i], tabPanel);
            tab.getUIElement().click(() => {
                this.selectTab(i);
            }).css('width', (100.0 / this.tabCodes.length) + '%');

            this.tabs.push(tab);
            const tabIndex = i;
        }
    }

    getUIElement() {
        if (!this.uiElement) {
            this.uiElement = $('<div class="tab-elements"></div>');
            const tabsContainer = new TabsContainer(this.translator, this.isMobileDevice, this.elementCode, this.tabs);
            const tabPanelsContainer = new TabPanelsContainer(this.translator, this.isMobileDevice, this.elementCode, this.tabPanels);
            this.uiElement.append(tabsContainer.getUIElement());
            this.uiElement.append(tabPanelsContainer.getUIElement());
        }
        return this.uiElement;
    }

    onSelect(callback) {
        for (let t = 0; t < this.tabs.length; t++) {
            this.tabs[t].onSelect(function () {
                callback(t);
            });
        }
    }

    onSelectTab(i, callback) {
        this.tabs[i].onSelect(callback);
    }

    selectTab(i) {
        for (let t = 0; t < this.tabs.length; t++) {
            if (t === i) {
                this.selectedTabIndex = i;
                this.tabs[t].select();
            } else {
                this.tabs[t].unselect();
            }
        }
    }

    getSelectedIndex(){
        return this.selectedTabIndex;
    }

    getCode() {
        return this.elementCode;
    }
}

class Tab extends UIElement {
    constructor(translator, isMobileDevice, elementCode, tabCode, tabName, tabPanel) {
        super(tabCode, translator);
        this.isMobileDevice = isMobileDevice;
        this.elementCode = elementCode;
        this.tabCode = tabCode;
        this.tabName = tabName;
        this.tabPanel = tabPanel;
        this.element = $('<div tabindex="0" id="' + this.id + '" role="tab" aria-controls="' + this.tabPanel.getCode() + '" class="tab tab-' + this.elementCode + '" aria-selected="false">' + this.tabName + '</div>');
    }

    getUIElement() {
        return this.element;
    }

    select() {
        if (!this.element.hasClass('selected')) {
            this.element
                .addClass('selected')
                .attr('aria-selected', 'true');
            this.tabPanel.select();
            if (this.onSelectCallbacks)
                this.onSelectCallbacks.forEach(c => c());
        }
    }

    onSelect(callback) {
        if (!this.onSelectCallbacks) {
            this.onSelectCallbacks = [];
        }
        this.onSelectCallbacks.push(callback);
    }

    unselect() {
        if (this.element.hasClass('selected')) {
            this.element
                .removeClass('selected')
                .attr('aria-selected', 'false');
            this.tabPanel.unselect();
        }
    }

    getCode() {
        return this.id;
    }
}

class TabsContainer extends UIElement {
    constructor(translator, isMobileDevice, elementCode, tabs) {
        super(elementCode, translator);
        this.isMobileDevice = isMobileDevice;
        this.elementCode = elementCode;
        this.tabs = tabs;
    }

    getUIElement() {
        const element = $('<div role="tablist" class="tabs-container"></div>');
        for (let t in this.tabs) {
            element.append(this.tabs[t].getUIElement());
        }
        return element;
    }
}

class TabPanel extends UIElement {
    constructor(translator, isMobileDevice, elementCode, tabCode, tabContent) {
        super(tabCode + '_panel', translator);
        this.isMobileDevice = isMobileDevice;
        this.elementCode = elementCode;
        this.tabContent = tabContent;
        this.element = $('<div tabindex="0" id="' + this.id + '" role="tabpanel" aria-labelledby="' + tabCode + '" class="tab-panel" hidden></div>')
        this.element.append(this.tabContent);
    }

    getUIElement() {
        return this.element;
    }

    select() {
        this.element
            .removeAttr('hidden')
            .addClass('selected');
    }

    unselect() {
        this.element
            .attr('hidden', '')
            .removeClass('selected');
    }

    getCode() {
        return this.id;
    }
}

class TabPanelsContainer extends UIElement {
    constructor(translator, isMobileDevice, elementCode, tabPanels) {
        super(elementCode, translator);
        this.isMobileDevice = isMobileDevice;
        this.elementCode = elementCode;
        this.tabPanels = tabPanels;
    }


    getUIElement() {
        const element = $('<div class="tab-panels-container"></div>');
        for (let t in this.tabPanels) {
            element.append(this.tabPanels[t].getUIElement());
        }
        return element;
    }
}

export {TabsElement}

import {UIElement} from "./ui";
import '../../css/ui/modal.css';
import '../../css/ui/modal.responsive.css';

class Modal extends UIElement {

    constructor(translator, target, id) {
        super(id, translator);
        this.target = target;
        this.id = id;
        this.hideCallbacks = [];
    }

    getUIElement() {
        if (!this.uiElement) {
            this.uiElement = $(
                '<div id="' + this.id + '" class="modal-outer">' +
                '   <div class="modal-inner" role="dialog" aria-modal="true" aria-labelledby="' + this.id + '_title">' +
                '       <div class="modal-header">' +
                '           <div class="modal-title" id="' + this.id + '_title">' +
                '           </div>' +
                '           <div class="modal-buttons-container">' +
                '               <button class="modal-closer" type="button" title="' + this.translator.translate('modal.closer.name') + '"><i class="fa-solid fa-close"></i></button>' +
                '           </div>' +
                '       </div>' +
                '       <div class="modal-content">' +
                '       </div>' +
                '   </div>' +
                '</div>'
            );
            const self = this;
            $($('.modal-buttons-container button.modal-closer', this.uiElement)[0]).click(function () {
                self.hide();
            });

            this.uiElement.addClass(this.getModalClasses());
            this.target.append(this.uiElement);
            this.visible = false;
        }
        return this.uiElement;
    }

    onHide(callback) {
        this.hideCallbacks.push(callback);
    }

    getModalClasses() {
        return '';
    }

    show() {
        if (!this.visible) {
            $($('.modal-inner', this.getUIElement().addClass('visible').removeAttr('hidden'))[0]).attr('tabIndex', "1");
            this.visible = true;
            UIElement.openUIElements.push(this);
        }
    }

    hide() {
        if (this.visible) {
            $($('.modal-inner', this.getUIElement().removeClass('visible').attr('hidden', ''))[0]).attr('tabIndex', "-1");
            this.visible = false;
            for (let c in this.hideCallbacks)
                this.hideCallbacks[c]();
            UIElement.openUIElements.pop();
        }
    }

    isVisible() {
        return !!this.visible;
    }

    setTitle(titleText) {
        $($('.modal-title', this.getUIElement())[0]).html(titleText);
    }

    setContent(elements) {
        $($('.modal-content', this.getUIElement())[0]).empty().append(elements);
    }

    getContent() {
        return $($('.modal-content', this.getUIElement())[0]);
    }

    getCode() {
        return this.id;
    }

    close() {
        this.hide();
    }
}

class ModalFull extends Modal {
    getModalClasses() {
        return 'full';
    }
}


class ModalHalf extends Modal {
    getModalClasses() {
        return 'half';
    }
}


export {
    ModalFull,
    ModalHalf
};
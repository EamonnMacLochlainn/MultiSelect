class MultiSelect
{
    constructor(select_element, preferences = {}, callback_fn = null) {
        this.css_prefix = 'multi-selector-'; // CSS class that is prefixed to pretty much all generated elements
        this.$select = $(select_element);
        this.preferences = {
            ignore_first_option: true, // if your select element has a default 'blank' first option
            n_selected_singular: 'item', // the term used to describe what is selected; e.g. "1 item selected"
            n_selected_plural: '', // the term used to describe what is selected; e.g. "1 items selected". Defaults to n_selected_singular + 's'
			
            use_styled_checkboxes: false, // if you are using FontAwesome or such instead of basic HTML checkboxes
            checkbox_css_class: this.css_prefix + 'input',
            label_class: this.css_prefix + 'label',
			
            expand_direction: 'auto', // whether the list expands downwards or upwards (takes viewport edge into account)
			
            add_select_all_toggle: true, // whether to add a 'Select All' toggle at the top of the list
            select_all_toggle_text_on: 'Select All',
            select_all_toggle_text_off: 'De-select All',
			
            trigger_change_event: false, // if checking a checkbox triggers a change event for the select element
            custom_change_function: null // a function to call on the checking of a checkbox
        };
        $.extend(this.preferences, preferences);
        this.$element = this.create_checkbox_container();
        this.expand_direction = this.preferences.expand_direction;
        this.init();
    }

    init()
    {
        this.$select.hide();
        this.populate_checkbox_list();
        this.add_event_listeners();
    }

    create_checkbox_container()
    {
        const container_class = `${this.css_prefix}container`;
        const container = $('<div/>').addClass(container_class);
        container.attr(this.$select.data());

        const count = $('<span/>').text('0 items selected').addClass(`${this.css_prefix}list-count`),
            toggle = $('<span/>').html('<i class="fas fa-chevron-down"></i>').addClass(`${this.css_prefix}list-toggle`),
            list_ctn = $('<div/>').addClass(`${this.css_prefix}list-ctn`);

        const pseudo_select = $('<span/>').addClass(`${this.css_prefix}pseudo-select`);

        // If select element is empty
        if (this.$select.find('option').length === 0)
        {
            pseudo_select.html(`<span class="${this.css_prefix}no-options">No options</span>`);
            container.append(pseudo_select);
            this.$select.after(container);
            return container;
        }

        pseudo_select.append(count, toggle);

        container.append(pseudo_select, list_ctn);
        if(this.$select.next('.' + container_class).length > 0)
            this.$select.next('.' + container_class).remove();
        this.$select.after(container);

        return container;
    }

    _generate_checkbox_list()
    {
        const list_ctn = this.$element.find(`.${this.css_prefix}list-ctn`);
        list_ctn.empty();

        const select_options = this.$select.find('option');
        select_options.each((index, option) =>
        {
            if(this.preferences.ignore_first_option && index === 0)
                return true;

            const $option = $(option),
                label = $('<label/>').addClass(this.preferences.label_class),
                label_text = $('<span/>').addClass(`${this.css_prefix}label-text`).text($option.text());

            const checkbox_input = $('<input/>').attr({
                type: 'checkbox',
                value: $option.val(),
                disabled: $option.prop('disabled'),
                checked: false, // Always set to false initially
            }).data($option.data());

            if(this.preferences.use_styled_checkboxes)
            {
                const checkbox_ctn = $('<div/>').addClass(`${this.css_prefix}custom-checkbox-container`),
                    custom_checkbox = $('<span/>').addClass(`${this.css_prefix}custom-checkbox`);

                if(this.preferences.checkbox_css_class)
                    custom_checkbox.addClass(this.preferences.checkbox_css_class);

                checkbox_input.on('change', () => {
                    custom_checkbox.toggleClass('checked', checkbox_input.prop('checked'));
                    this.update_selected_count();
                });

                checkbox_ctn.append(custom_checkbox);
                label.append(checkbox_ctn, checkbox_input, label_text);
            }
            else
            {
                checkbox_input.addClass('not-fancy');
                if(this.preferences.checkbox_css_class)
                    checkbox_input.addClass(this.preferences.checkbox_css_class);
                label.append(checkbox_input, label_text);
            }

            list_ctn.append(label);
        });
    }

    prepend_toggle_all_checkbox()
    {
        const toggleAllSpan = $('<span/>').addClass(`${this.css_prefix}toggle-all-checkbox`).text(this.preferences.select_all_toggle_text_on);
        toggleAllSpan.on('click', () =>
        {
            const isChecked = toggleAllSpan.attr('data-checked') === 'true';
            const inps = this.$element.find(`.${this.css_prefix}list-ctn input`);
            inps.prop('checked', !isChecked).trigger('change');

            toggleAllSpan.attr('data-checked', !isChecked);
        });

        this.$element.find(`.${this.css_prefix}list-ctn`).prepend(toggleAllSpan);
    }

    populate_checkbox_list()
    {
        this._generate_checkbox_list();
        if(this.preferences.add_select_all_toggle)
            this.prepend_toggle_all_checkbox();
        this.update_selected_count();
    }

    refresh_options()
    {
        this._generate_checkbox_list();
        if(this.preferences.add_select_all_toggle)
            this.prepend_toggle_all_checkbox();
        this.update_selected_count();
    }

    get_checked_option_values()
    {
        return this.$element.find(`.${this.css_prefix}list-ctn input:checked`).map(function () {
            return $(this).val();
        }).get();
    }

    update_selected_count()
    {
        const count_ctn = this.$element.find(`.${this.css_prefix}list-count`),
            n = this.$element.find('input:checked').length,
            txt = (n === 1)
                ? this.preferences.n_selected_singular
                : (this.preferences.n_selected_plural || `${this.preferences.n_selected_singular}s`);

        count_ctn.html(`${n} <span class="${this.css_prefix}list-count-descriptor">${txt}</span> selected`);
    }

    toggle_checkbox_list()
    {
        const listCtn = this.$element.find(`.${this.css_prefix}list-ctn`);
        const pseudo_select = Math.ceil(this.$element.find(`.${this.css_prefix}pseudo-select`).width());
        const closing = listCtn.is(':visible');
        const icon = this.$element.find(`.${this.css_prefix}list-toggle > i`);

        listCtn.css('min-width', `calc(${pseudo_select}px + 1.75em)`);

        if (!closing && this.$select.find('option').length > 0) {
            this.$element.css('z-index', 1000);
        }

        // Determine the expansion direction
        const expandDirection = this.determine_expansion_direction();

        // Set the appropriate CSS for the list container
        if (expandDirection === 'up') {
            listCtn.css({
                bottom: '100%',
                top: 'auto'
            });
        } else {
            listCtn.css({
                top: '100%',
                bottom: 'auto'
            });
        }

        // Toggle visibility
        if (closing) {
            listCtn.hide();
            icon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
            this.$element.css('z-index', 2);
        } else {
            listCtn.show();
            icon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
        }
    }

    determine_expansion_direction()
    {
        if (this.expand_direction !== 'auto') {
            return this.expand_direction;
        }

        const viewportHeight = $(window).height();
        const scrollTop = $(window).scrollTop();
        const pseudoSelect = this.$element.find(`.${this.css_prefix}pseudo-select`);
        const pseudoSelectOffset = pseudoSelect.offset().top - scrollTop; // Relative to viewport
        const pseudoSelectHeight = pseudoSelect.outerHeight();

        // Calculate the actual height of the list content
        const listCtn = this.$element.find(`.${this.css_prefix}list-ctn`);
        let listHeight = 0;

        // Temporarily show and position the list off-screen to measure its height
        listCtn.css({
            position: 'absolute',
            left: '-9999px',
            top: '-9999px',
            display: 'block'
        });

        listHeight = listCtn.outerHeight();

        // Hide the list again
        listCtn.css({
            position: '',
            left: '',
            top: '',
            display: 'none'
        });

        // Check if there's enough space below
        if (pseudoSelectOffset + pseudoSelectHeight + listHeight <= viewportHeight)
            return 'down';

        // Check if there's enough space above
        if (pseudoSelectOffset - listHeight >= 0)
            return 'up';

        // If neither direction has enough space, choose the direction with more space
        const spaceBelow = viewportHeight - (pseudoSelectOffset + pseudoSelectHeight);
        return spaceBelow >= pseudoSelectOffset ? 'down' : 'up';
    }

    add_event_listeners()
    {
        const _this = this;
        this.$element.find(`.${this.css_prefix}list-ctn input`).on('change', function()
        {
            _this.update_selected_count();
            _this.handle_checkbox_change($(this));
        });
        this.$element.find(`.${this.css_prefix}pseudo-select`).on('click', () =>
        {
            this.toggle_checkbox_list();
        });
    }

    handle_checkbox_change(checkbox)
    {
        let is_checked = checkbox.prop('checked'),
            value = checkbox.val();

        // Update the underlying select element
        this.$select.find(`option[value="${value}"]`).prop('selected', is_checked);
        if(this.preferences.trigger_change_event)
            this.$select.trigger('change');
        if(typeof this.preferences.custom_change_function === 'function')
            this.preferences.custom_change_function(value, is_checked);
    }


    check_options(values, clear_currently_checked = true)
    {
        if(clear_currently_checked)
        {
            this.$element.find(`.${this.css_prefix}list-ctn input:checked`).prop('checked', false);
            this.$element.find(`.${this.css_prefix}custom-checkbox.checked`).removeClass('checked');
        }

        const checkboxes = this.$element.find(`.${this.css_prefix}list-ctn input`);
        values.forEach(value =>
        {
            let checkbox = checkboxes.filter(`[value="${value}"]`);
            checkbox.prop('checked', true);
            checkbox.parent().find(`.${this.css_prefix}custom-checkbox`).addClass('checked');
        });

        this.update_selected_count();
    }

    toggle_select_all(check_all = null)
    {
        let toggle = this.$element.find(`.${this.css_prefix}select-all-toggle`),
            current_state_making_checked = (parseInt(toggle.attr('data-state')) === 1),
            make_checked = (check_all !== null) ? check_all : current_state_making_checked,
            new_state_value = (make_checked) ? 0 : 1,
            new_text = (make_checked) ? this.preferences.select_all_toggle_text_off : this.preferences.select_all_toggle_text_on;

        toggle.attr('data-state', new_state_value).text(new_text);
        let checkboxes = this.$element.find(`.${this.css_prefix}list-ctn input`);
        checkboxes.prop('checked', make_checked);

        if(this.preferences.use_styled_checkboxes)
            this.$element.find(`.${this.css_prefix}custom-checkbox`).toggleClass('checked', make_checked);

        this.update_selected_count();
    }


    disable_selection()
    {
        this.close_checkbox_list();
        let ps = this.$element.find(`.${this.css_prefix}pseudo-select`);
        ps.off('click'); ps.addClass(`${this.css_prefix}pseudo-select-disabled`);
        this.$element.find('.${this.css_prefix}toggle-all-checkbox').off('click');
        this.$element.find(`.${this.css_prefix}list-ctn input`).prop('disabled', true);
    }

    enable_selection()
    {
        this.$element.find(`.${this.css_prefix}list-ctn input`).prop('disabled', false);

        let _this = this,
            ps = this.$element.find(`.${this.css_prefix}pseudo-select`);
        ps.on('click', function() {
            _this.toggle_checkbox_list();
        });
        ps.removeClass(`${this.css_prefix}pseudo-select-disabled`);
    }

    close_checkbox_list()
    {
        const listCtn = this.$element.find(`.${this.css_prefix}list-ctn`);
        listCtn.hide();
    }
}

from django import template

register = template.Library()


@register.filter(is_safe=True)
def remove_tags(value):
    value = value.replace("<", "&lt;")
    value = value.replace(">", "&gt;")
    value = value.replace('"', "&quot;")
    value = value.replace('\'', "&#x27;")
    return value

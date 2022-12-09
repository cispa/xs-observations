from django import template

register = template.Library()

@register.filter(name='times') 
def times(number):
    try:
        num = int(number)
    except (ValueError)  as e:
        print(e)
        num = 0
    return range(num)
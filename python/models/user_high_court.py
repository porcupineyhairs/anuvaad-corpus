"""
 * @author ['aroop']
 * @email ['aroop.ghosh@tarento.com']
 * @create date 2020-01-06 12:40:01
 * @modify date 2020-01-06 12:40:01
 * @desc [description]
 """
 
from mongoengine import *

class UserHighCourt(DynamicDocument):
    high_court_code = StringField(required=True)
    user_id = StringField(required=True)





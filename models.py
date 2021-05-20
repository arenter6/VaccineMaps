"""
This file defines the database models
"""

import datetime
from .common import db, Field, auth, T
from pydal.validators import *


def get_user_email():
    return auth.current_user.get('email') if auth.current_user else None

def get_time():
    return datetime.datetime.utcnow()

VACCINES = {
    'Pfizer-BioNTech': 'Pfizer-BioNTech',
    'Moderna': 'Moderna',
    'Johnson & Johnson': 'Johnson & Johnson'
}


#I have changed auth.py to take inputs of age and gender
#Not ideal, gotta find where they call auth.html endpoint and form

##Need to make form using gender/age and store into review
#use this form for authorization
db.define_table(
    'user_info',
    Field('users_id', db.auth_user, default=auth.user_id),
    Field('gender'),
    Field('age')
)

##Table for reviews
##store all address in lower case
##use zip code and address to access in database and set into the map
## map should have the total ratings/ num of ratings

db.define_table(
    'review',
    Field('users_id', db.auth_user, default=auth.user_id),
    Field('vaccine_type', requires=IS_IN_SET(VACCINES), error_message=T("Please choose from the list above.")),
    Field('rating', requires=IS_FLOAT_IN_RANGE(0, 5), error_message=T("Please enter a rating between 0 and 5.")),
    Field('site_address', requires=IS_NOT_EMPTY(), error_message=T("Please enter a valid location.")),
    Field('zip_code', requires=IS_INT_IN_RANGE(501, 99999), error_message=T("Please enter a valid zip code.")),
    Field('feedback', type='string'),
    Field('submitted_time', default=get_time),
)

db.define_table(
    'site',
    Field('address'),
    Field('city'),
    Field('zipcode'),
    Field('distance'),
    Field('availability'),
)


#db.user.id.readable = False
#db.user.user_email.readable = db.user.user_email.writable = False
db.review.id.readable = False
db.review.submitted_time.readable = db.review.submitted_time.writable = False
#db.review.user_email.readable = db.review.user_email.writable = False
db.review.users_id.readable = False

db.commit()

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


##Table for reviews
db.define_table(
    'review',
    Field('users_id', db.auth_user, default=auth.user_id),
    Field('vaccine_type', requires=IS_IN_SET(VACCINES), error_message=T("Please choose from the list above.")),
    Field('rating', requires=IS_INT_IN_RANGE(0, 6), error_message=T("Please enter a rating between 0 and 5.")),
    Field('site_address', requires=IS_NOT_EMPTY(), error_message=T("Please enter a valid address.")),
    Field('city', requires=IS_NOT_EMPTY(), error_message=T("Please enter a valid city.")),
    Field('state', requires=IS_NOT_EMPTY(), error_message=T("Please enter a valid state.")), #Probably need to make a drop down list of states
    Field('feedback', type='string'),
    Field('submitted_time', default=get_time),
)

#used for map
db.define_table(
    'site',
    Field('total_rating'),
    Field('num_raters'),
    Field('average_rating'),
    Field('address'),
    Field('city'),
    Field('state')
)


#db.user.id.readable = False
#db.user.user_email.readable = db.user.user_email.writable = False
db.review.id.readable = False
db.review.submitted_time.readable = db.review.submitted_time.writable = False
#db.review.user_email.readable = db.review.user_email.writable = False
db.review.users_id.readable = False

us_states = {
    "AL": "Alabama",
    "AK": "Alaska",
    "AZ": "Arizona",
    "AR": "Arkansas",
    "CA": "California",
    "CO": "Colorado",
    "CT": "Connecticut",
    "DE": "Delaware",
    "DC": "District Of Columbia",
    "FL": "Florida",
    "GA": "Georgia",
    "HI": "Hawaii",
    "ID": "Idaho",
    "IL": "Illinois",
    "IN": "Indiana",
    "IA": "Iowa",
    "KS": "Kansas",
    "KY": "Kentucky",
    "LA": "Louisiana",
    "ME": "Maine",
    "MD": "Maryland",
    "MA": "Massachusetts",
    "MI": "Michigan",
    "MN": "Minnesota",
    "MS": "Mississippi",
    "MO": "Missouri",
    "MT": "Montana",
    "NE": "Nebraska",
    "NV": "Nevada",
    "NH": "New Hampshire",
    "NJ": "New Jersey",
    "NM": "New Mexico",
    "NY": "New York",
    "NC": "North Carolina",
    "ND": "North Dakota",
    "OH": "Ohio",
    "OK": "Oklahoma",
    "OR": "Oregon",
    "PA": "Pennsylvania",
    "RI": "Rhode Island",
    "SC": "South Carolina",
    "SD": "South Dakota",
    "TN": "Tennessee",
    "TX": "Texas",
    "UT": "Utah",
    "VT": "Vermont",
    "VA": "Virginia",
    "WA": "Washington",
    "WV": "West Virginia",
    "WI": "Wisconsin",
    "WY": "Wyoming"
}

db.commit()

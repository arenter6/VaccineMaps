"""
This file defines actions, i.e. functions the URLs are mapped into
The @action(path) decorator exposed the function at URL:

    http://127.0.0.1:8000/{app_name}/{path}

If app_name == '_default' then simply

    http://127.0.0.1:8000/{path}

If path == 'index' it can be omitted:

    http://127.0.0.1:8000/

The path follows the bottlepy syntax.

@action.uses('generic.html')  indicates that the action uses the generic.html template
@action.uses(session)         indicates that the action uses the session
@action.uses(db)              indicates that the action uses the db
@action.uses(T)               indicates that the action uses the i18n & pluralization
@action.uses(auth.user)       indicates that the action requires a logged in user
@action.uses(auth)            indicates that the action requires the auth object

session, db, T, auth, and tempates are examples of Fixtures.
Warning: Fixtures MUST be declared with @action.uses({fixtures}) else your app will result in undefined behavior
"""

from py4web import action, request, abort, redirect, URL, Field
from yatl.helpers import A
from . common import db, session, T, cache, auth
from py4web.utils.url_signer import URLSigner
from .models import get_user_email
from py4web.utils.form import Form, FormStyleBulma
from pydal.validators import *
from .settings_private import *

url_signer = URLSigner(session)
vaccines = {
        'Pfizer-BioNTech': 'Pfizer-BioNTech',
        'Moderna': 'Moderna',
        'Johnson & Johnson': 'Johnson & Johnson'
}
experience_fields = [Field('vaccine_type', requires=IS_IN_SET(vaccines), error_message=T("Please choose from the list above.")),
                     Field('rating', requires=IS_FLOAT_IN_RANGE(0, 5), error_message=T("Please enter a rating between 0 and 5.")),
                     Field('site_address', requires=IS_NOT_EMPTY(), error_message=T("Please enter a valid location.")),
                     Field('zip_code', requires=IS_INT_IN_RANGE(501, 99999), error_message=T("Please enter a valid zip code.")),
                     Field('feedback', type='string')]

@action('index')
@action.uses(db, auth, 'index.html')
def index():
    print("User:", get_user_email())
    return dict()


#####Experience Start
@action('experience', method=["GET", "POST"])
@action.uses(db, auth, 'experience.html')
def experience():
    user = auth.get_user()
    if user.get('email') is not None:
        print("User:" + user.get('email') + " logged in on Experience")
        review_info = db(db.review.users_id == user.get('id')).select().as_list()
        return dict(logged_in=1, user=user, review_info=review_info, url_signer=url_signer)
    else:
        print("User: Not logged in on Experience")
        return dict(logged_in=0)

@action('submit_review', method=['GET', 'POST'])
@action.uses(db, session, auth.user, 'submit_review.html')
def submit_review():
    user = auth.get_user()
    form = Form(experience_fields, csrf_session=session, formstyle=FormStyleBulma)
    if form.accepted:
        print(get_user_email() + "'s review has been successfully submitted!")
        db.review.insert(users_id=user.get('id'), user_email=user.get('email'), vaccine_type=form.vars['vaccine_type'],
                         rating=form.vars['rating'], site_address=form.vars['site_address'], zip_code=form.vars['zip_code'],
                         feedback=form.vars['feedback'])
        redirect(URL('experience'))
    return dict(form=form)

@action('edit_review/<review_id:int>', method=["GET", "POST"])
@action.uses(db, session, auth.user, url_signer.verify(), 'edit_review.html')
def edit_review(review_id=None):
    assert review_id is not None
    user = auth.get_user()
    r = db.review[review_id]
    if r is None:
        print("Review does not exist")
        redirect(URL('experience'))
    form = Form(experience_fields, record=r, deletable=False, csrf_session=session, formstyle=FormStyleBulma)
    if form.accepted:
        print(get_user_email() + "'s review was successfully updated.")
        db(db.review.id == r.id).update(vaccine_type=form.vars['vaccine_type'], zip_code=form.vars['zip_code'],
                                        rating=form.vars['rating'], site_address=form.vars['site_address'],
                                        feedback=form.vars['feedback'])
        redirect(URL('experience'))
    return dict(form=form, user=user)

@action('delete_review/<review_id:int>')
@action.uses(db, session, auth.user, url_signer.verify())
def delete_review(review_id=None):
    assert review_id is not None
    db(db.review.id == review_id).delete()
    print(get_user_email() + "'s review was deleted.")
    redirect(URL('experience'))

@action('view_reviews')
@action.uses(db, session, auth, 'view_reviews.html')
def view_reviews():
    review_info = db(db.review.id != None).select().as_list()
    return dict(review_info=review_info)

#######Experience ends


#######Test Map using OpenStreetMaps
@action('test_map')
@action.uses(db, session, auth, 'test_map.html')
def test_map():
    return dict(API_KEY=API_KEY, USER_ID=USER_ID)

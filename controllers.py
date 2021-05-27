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
from .models import get_user_email, us_states
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
                     Field('rating', requires=IS_INT_IN_RANGE(0, 6), error_message=T("Please enter a rating between 0 and 5.")),
                     Field('site_address', requires=IS_NOT_EMPTY(), error_message=T("Please enter a valid location.")),
                     Field('city', requires=IS_NOT_EMPTY(), error_message=T("Please enter a valid city.")),
                     Field('state', requires=IS_IN_SET(us_states), error_message=T("Please select a valid state.")),
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
        can_review = True if len(review_info) < 2 else False
        return dict(logged_in=1, user=user, review_info=review_info, url_signer=url_signer, can_review=can_review)
    else:
        print("User: Not logged in on Experience")
        return dict(logged_in=0, can_review=False)

@action('submit_review', method=['GET', 'POST'])
@action.uses(db, session, auth.user, 'submit_review.html')
def submit_review():
    user = auth.get_user()
    form = Form(experience_fields, csrf_session=session, formstyle=FormStyleBulma)
    if form.accepted:
        print(get_user_email() + "'s review has been successfully submitted!")
        site = db((db.site.address == form.vars['site_address']) & (db.site.city == form.vars['city'])).select().first()
        print("Site: ")
        print(site)
        if site is not None: #increment raters and total rating if site already in db
            print("Updating a site")
            db((db.site.address == form.vars['site_address']) & (db.site.city == form.vars['city'])).update(
                total_rating=int(site.total_rating) + form.vars['rating'],
                num_raters=int(site.num_raters) + 1,
                average_rating=float(int(site.total_rating) + form.vars['rating'])/float(int(site.num_raters) + 1)
            )
        else: #insert a new site with initial rating and rater
            print("Inserting a site")
            db.site.insert(
                address=form.vars['site_address'],
                city=form.vars['city'],
                state=form.vars['state'],
                total_rating=form.vars['rating'],
                num_raters=1,
                average_rating=float(form.vars['rating'])
            )
        db.review.insert(users_id=user.get('id'), user_email=user.get('email'), vaccine_type=form.vars['vaccine_type'],
                         rating=form.vars['rating'], site_address=form.vars['site_address'],
                         city=form.vars['city'], state=form.vars['state'], feedback=form.vars['feedback'])
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
        site = db((db.site.address == form.vars['site_address']) & (db.site.city == form.vars['city'])).select().first()
        print(site)
        if site is not None: #if site is already in db
            if (r.site_address != form.vars['site_address']) or (r.city != form.vars['city']) or (r.state != form.vars['state']): #if location is changed
                db((db.site.address == form.vars['site_address']) & (db.site.city == form.vars['city'])).update(
                    total_rating=int(site.total_rating) - int(r.rating) + form.vars['rating'],
                    num_raters=int(site.num_raters) + 1,
                    average_rating=float(int(site.total_rating) - int(r.rating) + form.vars['rating'])/float(int(site.num_raters) + 1)
                )
                #decrement old rating and raters
                old_site = db((db.site.address == r.site_address) & (db.site.city == r.city)).select().first()
                if int(old_site.num_raters) <= 1: #avoid division by 0
                    db((db.site.address == r.site_address) & (db.site.city == r.city)).delete()
                else:
                    db((db.site.address == r.site_address) & (db.site.city == r.city)).update(
                        total_rating=int(old_site.total_rating) - int(r.rating),
                        num_raters=int(old_site.num_raters) - 1,
                        average_rating=float(int(old_site.total_rating) - int(r.rating))/float(int(old_site.num_raters) - 1)
                    )
            else: #user did not change site address, city or state so just update the total ratings and average
                db((db.site.address == form.vars['site_address']) & (db.site.city == form.vars['city'])).update(
                    total_rating=int(site.total_rating) - int(r.rating) + form.vars['rating'],
                    average_rating=float(int(site.total_rating) - int(r.rating) + form.vars['rating'])/float(site.num_raters)
                )
        else: #If the new site has not been reviewed, add one to db
            print("Inserted a location from edit")
            db.site.insert( #Insert new site rating
                address=form.vars['site_address'],
                city=form.vars['city'],
                state=form.vars['state'],
                total_rating=form.vars['rating'],
                num_raters=1,
                average_rating=float(form.vars['rating'])
            )
            #Remove old site rating and num raters and delete if 0 raters
            old_site = db((db.site.address == r.site_address) & (db.site.city == r.city)).select().first()
            if int(old_site.num_raters) <= 1: #avoid division by 0
                db((db.site.address == r.site_address) & (db.site.city == r.city)).delete()
            else:
                db((db.site.address == r.site_address) & (db.site.city == r.city)).update(
                    total_rating=int(old_site.total_rating) - int(r.rating),
                    num_raters=int(old_site.num_raters) - 1,
                    average_rating=float(int(old_site.total_rating) - int(r.rating))/float(int(old_site.num_raters) - 1)
                )

        db(db.review.id == r.id).update(vaccine_type=form.vars['vaccine_type'], rating=form.vars['rating'],
                                        site_address=form.vars['site_address'], city=form.vars['city'],
                                        state=form.vars['state'], feedback=form.vars['feedback'])
        redirect(URL('experience'))
    return dict(form=form, user=user)

@action('delete_review/<review_id:int>')
@action.uses(db, session, auth.user, url_signer.verify())
def delete_review(review_id=None):
    assert review_id is not None
    r = db.review[review_id]
    if r is None:
        redirect(URL('experience'))
    site = db((db.site.address == r.site_address) & (db.site.city == r.city)).select().first()
    if site is not None: #theoretically, site should always be there or else invalid submission
        if int(site.num_raters) <= 1:
            print("Deleted site")
            db((db.site.address == r.site_address) & (db.site.city == r.city)).delete()
        else:
            print("Updated site after review deletion")
            db((db.site.address == r.site_address) & (db.site.city == r.city)).update(
                total_rating=int(site.total_rating) - int(r.rating),
                num_raters=int(site.num_raters) - 1,
                average_rating=float(int(site.total_rating) - int(r.rating))/float(int(site.num_raters) - 1)
            )
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
    return dict(API_KEY=API_KEY, USER_ID=USER_ID, load_ratings_url=URL('load_ratings', signer=url_signer))

#######When a review is added, the site's average rating is recalculated

#######Return json object of site's average rating
@action('load_ratings')
@action.uses(url_signer.verify(), db, auth)
def load_ratings():
    state = request.params.get('state')
    if state is not None:
        ratings = db(db.site.state == state).select().as_list()
    else:
        ratings = db(db.site).select().as_list()
    ratings_json = {}
    for row in ratings: #Everytime we load ratings, calculate new average and set addresses to lower case
        rating_dict = {
            'average_rating': row["average_rating"],
            'city': row["city"].lower(),
        }
        ratings_json[row["address"].lower().rsplit(' ', 1)[0]] = rating_dict
    print(ratings_json)

    return dict(ratings=ratings_json)

#######Test data
@action('load_reviews')
@action.uses(url_signer.verify(), db, auth)
def load_reviews():
    reviews = db(db.review).select().as_list()
    reviews_json = []
    for row in reviews: #Everytime we load ratings, calculate new average and set addresses to lower case
        #change to use reviews rather than sites
        rating_dict = {
            'rating': int(row["rating"]),
            'vaccine_type': row["vaccine_type"],
        }
        reviews_json.append(rating_dict)
    print(reviews_json)

    return dict(ratings=reviews_json)


#######Test data charts
@action('test_data')
@action.uses(db, session, auth, 'test_data.html')
def test_data():
    return dict(USER_ID=USER_ID,
                load_reviews_url=URL('load_reviews', signer=url_signer),
           )

@action('get_data_url')
@action.uses(db, session, auth)
def get_data():
    data_url = request.params.get('data_url')
    return dict(data_url=data_url)

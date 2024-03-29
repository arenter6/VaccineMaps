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

from py4web import action, request, response, abort, redirect, URL, Field
from yatl.helpers import A
from . common import db, session, T, cache, auth
from py4web.utils.url_signer import URLSigner
from .models import get_user_email, us_states, get_time
from .private.settings_private import *
import csv, os, sys
from .settings import APP_FOLDER

url_signer = URLSigner(session)
vaccines = {
        'Pfizer-BioNTech': 'Pfizer-BioNTech',
        'Moderna': 'Moderna',
        'Johnson & Johnson': 'Johnson & Johnson'
}

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
        review_info = db(db.review.users_id == user.get('id')).select().as_list()
        review_info.sort(key=lambda x: x["vaccinated_date"]) #Returns current users vaccinations by increasing date
        can_review = True if len(review_info) < 2 else False
        return dict(logged_in=1, user=user, review_info=review_info, url_signer=url_signer, can_review=can_review)
    else:
        return dict(logged_in=0, can_review=False)

@action('submit_review', method=['GET', 'POST'])
@action.uses(db, session, auth.user, 'submit_review.html', url_signer.verify())
def submit_review():
    user = auth.get_user() #double check
    if user is None:
        redirect(URL('experience'))
    return dict(submit_form_url=URL('submit_form', signer=url_signer))

#Submit form call from submit review
@action('submit_form', method="POST")
@action.uses(url_signer.verify(), db)
def submit_form():
    user = auth.get_user() #double check
    if user is None:
        redirect(URL('experience'))

    ##Check to see reviews are less than two
    site = db((db.site.address == request.json.get('site_address')) & (db.site.city == request.json.get('city'))).select().first()
    if site is not None: #increment raters and total rating if site already in db
        print("Updating a site")
        db((db.site.address == request.json.get('site_address')) & (db.site.city == request.json.get('city'))).update(
            total_rating=int(site.total_rating) + int(request.json.get('rating')),
            num_raters=int(site.num_raters) + 1,
            average_rating=float(int(site.total_rating) + int(request.json.get('rating')))/float(int(site.num_raters) + 1)
        )
    else: #insert a new site with initial rating and rater
        print("Inserting a site")
        db.site.insert(
            address=request.json.get('site_address'),
            city=request.json.get('city'),
            state=request.json.get('state'),
            total_rating=int(request.json.get('rating')),
            num_raters=1,
            average_rating=float(request.json.get('rating'))
        )
    try:
        site_array = request.json.get('site_address').split()
        address_link = "https://www.google.com/maps/place/"
        for word in site_array:
            address_link += word + "+"
        address_link += request.json.get('city') + "+" + request.json.get('state')
        db.review.insert(
            users_id=user.get('id'),
            user_email=user.get('email'),
            vaccine_type=request.json.get('vaccine_type'),
            rating=int(request.json.get('rating')),
            site_address=request.json.get('site_address'),
            address_link=address_link,
            city=request.json.get('city'),
            state=request.json.get('state'),
            feedback=request.json.get('feedback'),
            vaccinated_date=request.json.get('date'),
            precise_time=get_time,
        )
        response.status = 200
    except Exception as e:
        response.status = 500
        print(e)
        return "Something went wrong"
    print(get_user_email() + "'s review has been successfully submitted!")
    return dict(redirect=URL('experience'))



@action('edit_review/<review_id:int>', method=["GET", "POST"])
@action.uses(db, session, auth.user, url_signer.verify(), 'edit_review.html')
def edit_review(review_id=None):
    assert review_id is not None
    user = auth.get_user()
    return dict(review_id=review_id, user=user, signer=url_signer, edit_review_load_url=URL('edit_review_load', signer=url_signer), edit_review_submit_url=URL('edit_review_submit', signer=url_signer))

#Gets the review record and sends edit review
@action('edit_review_load')
@action.uses(db, session, auth.user, url_signer.verify())
def edit_review_load():
    user = auth.get_user()
    review_id = request.params.get('review_id')
    r = db.review[review_id]
    assert r is not None
    assert r.users_id == user.get('id')
    review = {'vaccine_type': r.vaccine_type, 'rating': r.rating, 'site_address': r.site_address,
              'city': r.city, 'state': r.state, 'feedback': r.feedback, 'date': r.vaccinated_date}
    return dict(review=review)

#Submit the edited form
@action('edit_review_submit', method="POST")
@action.uses(url_signer.verify(), db)
def edit_review_submit():
    user = auth.get_user() #double check
    if user is None:
        redirect(URL('experience'))

    old_review_id = int(request.json.get('old_id'))
    r = db.review[old_review_id]
    print(get_user_email() + "'s review was successfully updated.")
    site = db((db.site.address == request.json.get('site_address')) & (db.site.city == request.json.get('city'))).select().first()
    #First update the site
    if site is not None: #if site is already in db
        if (r.site_address != request.json.get('site_address')) or (r.city != request.json.get('city')) or (r.state != request.json.get('state')): #if location is changed
            db((db.site.address == request.json.get('site_address')) & (db.site.city == request.json.get('city'))).update(
                total_rating=int(site.total_rating) + int(request.json.get('rating')),
                num_raters=int(site.num_raters) + 1,
                average_rating=float(int(site.total_rating) + int(request.json.get('rating')))/float(int(site.num_raters) + 1)
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
            db((db.site.address == request.json.get('site_address')) & (db.site.city == request.json.get('city'))).update(
                total_rating=int(site.total_rating) - int(r.rating) + int(request.json.get('rating')),
                average_rating=float(int(site.total_rating) - int(r.rating) + int(request.json.get('rating')))/float(site.num_raters)
            )
    else: #If the new site has not been reviewed, add one to db
        print("Inserted a location from edit")
        db.site.insert( #Insert new site rating
            address=request.json.get('site_address'),
            city=request.json.get('city'),
            state=request.json.get('state'),
            total_rating=int(request.json.get('rating')),
            num_raters=1,
            average_rating=float(request.json.get('rating'))
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
    try: #Update the review
        site_array = request.json.get('site_address').split()
        address_link = "https://www.google.com/maps/place/"
        for word in site_array:
            address_link += word + "+"
        address_link += request.json.get('city') + "+" + request.json.get('state')
        db(db.review.id == r.id).update(vaccine_type=request.json.get('vaccine_type'), rating=int(request.json.get('rating')),
                                        site_address=request.json.get('site_address'), city=request.json.get('city'), address_link=address_link,
                                        vaccinated_date=request.json.get('date'), state=request.json.get('state'), feedback=request.json.get('feedback'))
        response.status = 200
    except Exception as e:
        response.status = 500
        print(e)
        return "Something went wrong"
    print(get_user_email() + "'s review has been successfully edited!")
    return dict(redirect=URL('experience'))

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
    #Returns reviews sorted by descending vaccination date
    review_info = db(db.review.id).select().as_list()
    review_info.sort(key=lambda x: x["vaccinated_date"], reverse=True)
    return dict(review_info=review_info)

#######Experience ends


#######Test Map using OpenStreetMaps
@action('vaccine_search')
@action.uses(db, session, auth, 'vaccine_search.html')
def vaccine_search():
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
            'average_rating': round(float(row["average_rating"]), 2),
            'city': row["city"].lower(),
        }
        ratings_json[row["address"].lower().rsplit(' ', 1)[0]] = rating_dict

    return dict(ratings=ratings_json)

#######Test data charts
@action('data')
@action.uses(db, session, auth, 'data.html')
def data():
    vaccines = ['Pfizer-BioNTech', 'Johnson & Johnson', 'Moderna']
    for i in range (0, 3):
        # print(i)
        writeCsvFile(vaccines[i])
    reviewAvgs = getAvgs(vaccines)
    totalReviews = db(db.review).count()
    return dict(USER_ID=USER_ID, get_data_url = URL('get_data'), vaccines = vaccines, 
    reviewAvgs = reviewAvgs, totalReviews = totalReviews)

def writeCsvFile(vaccine_type):
    hRows = db(db.review.vaccine_type == vaccine_type).select()
    bRows = db(db.review).select()
    hList = []
    bList = []
    hFields = ["rating"]
    bFields = ["vaccine_type,rating"]
    for row in hRows:
        hList.append(row["rating"])
    for row in bRows:
        #print(row)
        bList.append(row["vaccine_type"] + "," + str(row["rating"]))
    #print(bList)
    hList.sort()
    # print(pList)
    dataUrl = os.path.join(APP_FOLDER, "static")
    if os.environ.get("GAE_ENV"):
        histogramPath = dataUrl + "/" + vaccine_type + "_data.csv"
        boxplotPath = dataUrl + "/" + "boxplot_data.csv"
    else:
        histogramPath = dataUrl + "\\" + vaccine_type + "_data.csv"
        boxplotPath = dataUrl + "\\" + "boxplot_data.csv"
    with open(histogramPath, 'w') as csvfile:
        csvwriter = csv.writer(csvfile, lineterminator='\n', delimiter = '\n')
        csvwriter.writerow(hFields)
        csvwriter.writerow(hList)
    with open(boxplotPath, 'w') as csvfile:
        csvwriter = csv.writer(csvfile, lineterminator='\n', delimiter = '\n')
        csvwriter.writerow(bFields)
        csvwriter.writerow(bList)
    return ()

def getAvgs(vaccines):
    reviewAvgs = []
    tempAvg = 0
    for i in range(len(vaccines)):
        newList = []
        rows = db(db.review.vaccine_type == vaccines[i]).select().as_list()
        for row in rows:
            newList.append(int(row["rating"]))
        if (len(newList) == 0):
            tempAvg = 0
        else:
            tempAvg = sum(newList) / len(newList)
        reviewAvgs.append(tempAvg)
    return(reviewAvgs)

@action('get_data')
@action.uses(db, session, auth)
def get_data():
    data_url = request.params.get('data_url')
    return dict(data_url=data_url)

#About Us Redirect
@action('about_us')
@action.uses(db, session, auth, 'about_us.html')
def about_us():
    return dict()
@action('faq')
@action.uses(db, auth, 'faq.html')
def faq():
    return dict()


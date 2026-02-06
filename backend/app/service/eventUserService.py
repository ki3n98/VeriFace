from app.db.repository.eventUserRepo import EventUserRepository
from app.db.models.event_user import EventUser
# from app.service.eventService import EventService
from app.service.userService import UserService
from app.db.schema.EventUser import EventUserCreate, EventUserRemove
from app.db.schema.event import EventOutput
from app.db.schema.user import UserOutput, UserInCreate
from app.db.schema.csv import CSVUploadSuccess, CSVUploadFailure, CSVRowError
from app.util.csv_processor import generate_random_password

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from typing import List, Union, Dict


class EventUserService:

    def __init__(self, session: Session):
        self.__EventUserRepository = EventUserRepository(session=session)


    def add_relationship(self, event_user: EventUserCreate) -> EventUser:
        try:
            new_relationship = self.__EventUserRepository.add_relationship(event_user)
            return new_relationship
        
        #duplicate error
        except IntegrityError as e:
            if "unique constraint" in str(e).lower() or "EventsUsers_pkey" in str(e):
                self.__EventUserRepository.session.rollback()
                raise HTTPException(status_code=400, detail="Event User Relationship already exist.")

        except Exception as error:
            print(error)
            raise error
        
    
    def remove_relationship(self, event_user: EventUserRemove) -> str:
        try:
            self.__EventUserRepository.remove_relationship(event_user)
            return f"Relation of user ({event_user.user_id}) and  event ({event_user.event_id}) has been removed."

        except Exception as error:
            print(error)
            raise HTTPException(status_code=400, detail="Removing relationship ran into an error.")
        

    def get_users(self, event_id:int) -> List[UserOutput]:
        try:
            return self.__EventUserRepository.get_users_from_event(event_id=event_id)
        except Exception as error:
            print(error)
            raise error
        

    def get_event(self, user_id:int) -> List[EventOutput]:
        try:
            return self.__EventUserRepository.get_events_for_user(user_id=user_id)
        except Exception as error:
            print(error)
            raise error
        

    def bulk_add_users_from_csv(
            self,
            event_id: int,
            csv_rows: List[Dict[str,str]],
    ) -> Union[CSVUploadSuccess, CSVUploadFailure]:
        """Bulk add user using .csv."""
        user_service = UserService(session=self.__EventUserRepository.session)

        #Validation
        validation_errors: List[CSVRowError] = []
        operations_plan = []

        for idx, row in enumerate(csv_rows, start=2):
            email = row['email']
            first_name = row['first_name']
            last_name = row['last_name']

            try: 
                user = None
                is_new_user = False
                already_in_event = False

                try:
                    user = user_service.get_user_by_email(user_email=email)
                except HTTPException:
                    #user doesn't exist in db, need to create
                    is_new_user  = True

                #Check if user is already in event
                if user:
                    existing_users = self.get_users(event_id=event_id)
                    existing_users_ids = [u.id for u in existing_users]
                    if user.id in existing_users_ids:
                        already_in_event = True

                # Plan the operation
                operations_plan.append({
                    'row_number': idx,
                    'email': email,
                    'first_name': first_name,
                    'last_name': last_name,
                    'is_new_user': is_new_user,
                    'user_id': user.id if user else None,
                    'already_in_event': already_in_event
                })
            
            except Exception as e:
                validation_errors.append(CSVRowError(
                    row_number=idx,
                    first_name=first_name,
                    last_name=last_name,
                    email=email,
                    error_message=f"Validation error: {str(e)}"
                ))
        
        #if there are any ERRORS, return immediately with NO database changes
        if validation_errors:
            return CSVUploadFailure(
                message="CSV validation failed. No users were added to the event.",
                total_rows=len(csv_rows),
                valid_rows=len(csv_rows) - len(validation_errors),
                invalid_rows=len(validation_errors),
                errors=validation_errors
            )
        
        #Database Operations only if all validation passed.
        try:
                new_users_count = 0
                existing_users_count = 0
                already_in_event_count = 0
                
                for operation in operations_plan:
                    if operation['already_in_event']:
                        already_in_event_count += 1
                        continue
                    
                    if operation['is_new_user']:
                        # Create new user
                        temp_password = generate_random_password()
                        user_data = UserInCreate(
                            first_name=operation['first_name'],
                            last_name=operation['last_name'],
                            email=operation['email'],
                            password=temp_password
                        )
                        user = user_service.signup(user_details=user_data)
                        operation['user_id'] = user.id
                        new_users_count += 1
                    else:
                        existing_users_count += 1
                    
                    # Add user to event
                    event_user = EventUserCreate(
                        user_id=operation['user_id'],
                        event_id=event_id
                    )
                    self.add_relationship(event_user=event_user)

                total_added = new_users_count + existing_users_count
                return CSVUploadSuccess(
                    message=f"Successfully added {total_added} users to event '{event_id}'",
                    total_rows=len(csv_rows),
                    new_users_created=new_users_count,
                    existing_users_added=existing_users_count,
                    users_already_in_event=already_in_event_count
                )
        
        except Exception as e:
            # Any error in Phase 2 causes rollback
            self.__EventUserRepository.session.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Failed to add users to event: {str(e)}"
            )
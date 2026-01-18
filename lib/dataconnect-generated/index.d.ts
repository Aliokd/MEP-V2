import { ConnectorConfig, DataConnect, QueryRef, QueryPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface GetLessonDetailsData {
  lesson?: {
    id: UUIDString;
    title: string;
    videoUrl: string;
    midiDataUrl?: string | null;
    durationSeconds: number;
    movement: {
      title: string;
    };
      prerequisites: ({
        prerequisite: {
          id: UUIDString;
          title: string;
        } & Lesson_Key;
      })[];
  } & Lesson_Key;
}

export interface GetLessonDetailsVariables {
  lessonId: UUIDString;
}

export interface GetUserConstellationData {
  user?: {
    id: string;
    displayName?: string | null;
    lessonProgress: ({
      lessonId: UUIDString;
      status: ProgressStatus;
      accuracyScore?: number | null;
    })[];
  } & User_Key;
    lessonsList: ({
      id: UUIDString;
      title: string;
      movementId: UUIDString;
      order: number;
      durationSeconds: number;
      prerequisites: ({
        prerequisiteId: UUIDString;
      })[];
    } & Lesson_Key)[];
      movements: ({
        id: UUIDString;
        title: string;
        order: number;
      } & Movement_Key)[];
}

export interface GetUserConstellationVariables {
  uid: string;
}

export interface LessonPrerequisite_Key {
  lessonId: UUIDString;
  prerequisiteId: UUIDString;
  __typename?: 'LessonPrerequisite_Key';
}

export interface Lesson_Key {
  id: UUIDString;
  __typename?: 'Lesson_Key';
}

export interface MaestroNote_Key {
  id: UUIDString;
  __typename?: 'MaestroNote_Key';
}

export interface Movement_Key {
  id: UUIDString;
  __typename?: 'Movement_Key';
}

export interface RecitalReaction_Key {
  id: UUIDString;
  __typename?: 'RecitalReaction_Key';
}

export interface RepertoireItem_Key {
  id: UUIDString;
  __typename?: 'RepertoireItem_Key';
}

export interface UserLessonProgress_Key {
  userId: string;
  lessonId: UUIDString;
  __typename?: 'UserLessonProgress_Key';
}

export interface User_Key {
  id: string;
  __typename?: 'User_Key';
}

interface GetUserConstellationRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetUserConstellationVariables): QueryRef<GetUserConstellationData, GetUserConstellationVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetUserConstellationVariables): QueryRef<GetUserConstellationData, GetUserConstellationVariables>;
  operationName: string;
}
export const getUserConstellationRef: GetUserConstellationRef;

export function getUserConstellation(vars: GetUserConstellationVariables): QueryPromise<GetUserConstellationData, GetUserConstellationVariables>;
export function getUserConstellation(dc: DataConnect, vars: GetUserConstellationVariables): QueryPromise<GetUserConstellationData, GetUserConstellationVariables>;

interface GetLessonDetailsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetLessonDetailsVariables): QueryRef<GetLessonDetailsData, GetLessonDetailsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetLessonDetailsVariables): QueryRef<GetLessonDetailsData, GetLessonDetailsVariables>;
  operationName: string;
}
export const getLessonDetailsRef: GetLessonDetailsRef;

export function getLessonDetails(vars: GetLessonDetailsVariables): QueryPromise<GetLessonDetailsData, GetLessonDetailsVariables>;
export function getLessonDetails(dc: DataConnect, vars: GetLessonDetailsVariables): QueryPromise<GetLessonDetailsData, GetLessonDetailsVariables>;


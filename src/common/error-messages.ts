export enum ERRORS_MESSAGE {
  UNAUTHORIZED = 'Не верный логин или пароль',
  USER_NOT_FOUND = 'Пользователь не найден',
  DOUBLE = 'Пользователь с такими данными уже существует',
  UPDATE_DATA_NOT_FOUND = 'Не переданы данные для обновления',
  NOT_NULL_PROFILE_FIELDS = 'Поля профиля не могут быть null',
  DELETED_USER = 'Данный пользователь удален',
  DATA_NOT_VALID = 'Переданы некорректные данные',
}

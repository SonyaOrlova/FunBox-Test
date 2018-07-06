const init = () => {
  // Создает коллекцию адресов
  let myPoints = [];

  // Отрисовывает точки в DOM
  const addressesWrapper = document.querySelector(`.form__items-wrapper`);

  const renderDOMPoint = (address, id) => {
    const template = `
    <p class="form__address">${address}</p>
    <button class="form__delete-address">Удалить</button>
    `;
    const wrapper = document.createElement(`div`);
    wrapper.className = `form__item`;
    wrapper.dataset.id = id;
    wrapper.innerHTML = template;
    addressesWrapper.appendChild(wrapper);
    return wrapper;
  };

  // Меняет адреса в DOM при движении метки
  const changeDOMPoint = (addressElem, address) => {
    const addressInner = addressElem.querySelector(`.form__address`);
    addressInner.textContent = address;
  };

  //  Изменяет порядок точек в списке перетаскиванием
  const sortItems = (parentElement) => {
    let dragItem;
    let nextItem;
    // Указываем, что дочерние элементы аргумента перетаскиваемы
    parentElement.childNodes.forEach((child) => {
      child.draggable = true;
    });

    // Функция для события dragover
    const dragging = (evt) => {
      evt.preventDefault();
      /* Процесс сортировки (если элемент сместился вверх или вниз
      более чам на половину своей высоты, то соответственно переставляем его
      выше или ниже по списку) */
      let targetСhild = evt.target;
      let target = targetСhild.parentNode;

      if (target && target !== dragItem && target.parentNode === parentElement) {
        let coords = target.getBoundingClientRect();
        let isNext = (evt.clientY - coords.top) / (coords.bottom - coords.top) > 0.5;

        if (isNext && target.nextSibling !== null) {
          nextItem = target.nextSibling;
        } else if (isNext && target.nextSibling === null) {
          nextItem = null;
        } else {
          nextItem = target;
        }
        // меняет элементы списка местами
        parentElement.insertBefore(dragItem, nextItem);
      }
    };
    // Функция для события dragend
    const drop = (evt) => {
      evt.preventDefault();
      dragItem.classList.remove(`ghost`);
      parentElement.removeEventListener(`dragover`, dragging, false);
      parentElement.removeEventListener(`dragend`, drop, false);

      // меняет порядок точек в коллекции согласно новому списку и обновляет линию
      const newMyPoints = [];
      [...parentElement.children].map((child) => +child.dataset.id).forEach((it) => {
        let newPoint = [...myPoints].find((point) => +point.id === it);
        newMyPoints.push(newPoint);
      });

      myPoints = newMyPoints;
      renewLine();
    };

    // Начинает сортировку
    parentElement.addEventListener(`dragstart`, (evt) => {
      dragItem = evt.target; // Запоминаем элемент который будет перемещать
      parentElement.addEventListener(`dragover`, dragging);
      parentElement.addEventListener(`dragend`, drop);
      dragItem.classList.add(`ghost`);
    });
  };

  // Создает карту
  const myMap = new ymaps.Map(`map`, {
    center: [55.76, 37.64], // Москва
    zoom: 10,
    controls: [`zoomControl`]
  });

  // Задает параметры метки
  const createPlacemark = (coords) =>
    new ymaps.Placemark(coords,
        {},
        {
          iconColor: `#072f18`,
          draggable: true
        });

  // Обновляет зум при изменениях
  const renewZoom = () => {
    if(myPoints.length > 0) {
      myMap.setBounds(myMap.geoObjects.getBounds(), {
        checkZoomRange:true
      })
      .then(() => { 
        if(myMap.getZoom() > 15) {
          myMap.setZoom(15);
        }
      })
    } else {
      // если точек нет снова центрует на Москву
      myMap.setCenter([55.76, 37.64], 10);
    }
  };

  // Задает параметры линии
  let myPolyline;

  const createLine = () =>
    new ymaps.Polyline(
        [...myPoints].map((point) => point.coords),
        {},
        {
          balloonCloseButton: false,
          strokeColor: `#b3d338`,
          strokeWidth: 4
        });

  // Обновляет линию
  const renewLine = () => {
    myMap.geoObjects.remove(myPolyline);
    myPolyline = createLine();
    myMap.geoObjects.add(myPolyline);
  };

  // Обработчик на удаление DOM элемента, метки и переотрисовку линии
  const deletePoint = (point, addressElem, placemark) => {
    const deleteBtn = addressElem.querySelector(`.form__delete-address`);
    deleteBtn.addEventListener(`click`, (evt) => {
      evt.preventDefault();
      // Убирает DOM элемент с адресом
      addressElem.remove();
      // Убирает метку
      myMap.geoObjects.remove(placemark);
      // Убирает точку из коллекции и обновляем линию
      const pointIndex = myPoints.indexOf(myPoints.find((it) => it.coords === point.coords));
      myPoints.splice(pointIndex, 1);
      renewLine();
      renewZoom();
    });
  };

  // При вводе адреса в форму
  const form = document.querySelector(`.form`);
  const input = document.querySelector(`.form__input`);
  let id = 0; // уникальный номер точки

  form.addEventListener(`submit`, (evt) => {
    evt.preventDefault();
    evt.stopPropagation();
    const userAddress = input.value;
    input.value = ``; // очищает поле инпута после ввода
    let coords;
    let address;
    // Производит геокодирование по адресу, введеному пользователем
    ymaps.geocode(userAddress, {results: 1})
    .then((res) => {
      const firstGeoObject = res.geoObjects.get(0);
      // Получает координаты и полный адрес
      coords = firstGeoObject.geometry.getCoordinates();
      address = firstGeoObject.getAddressLine();
      // Создает точку и сохраняет ее в коллекцию
      let point = {
        coords,
        address,
        id: ++id
      };
      myPoints.push(point);
      // Создает метку
      const myPlacemark = createPlacemark(point.coords, point.address);
      myPlacemark.properties.set(`balloonContent`, point.address);
      myMap.geoObjects.add(myPlacemark);
      // Создает линию
      renewLine();
      // Добавляет адрес в DOM
      const addressElem = renderDOMPoint(point.address, point.id);
      // Вешаем обработчик на удаление точки
      deletePoint(point, addressElem, myPlacemark);
      // Вешаем обработчик на перетаскивание точек в списке
      sortItems(addressesWrapper);

      // Обработчик на перемещение метки
      myPlacemark.events.add(`dragend`, () => {
        // Получает новые коодинаты
        coords = myPlacemark.geometry.getCoordinates();
        point.coords = coords;
        // Обновляет линию
        renewLine();
        // Получает новый адрес
        ymaps.geocode(coords)
        .then((resp) => {
          address = resp.geoObjects.get(0) ?
            resp.geoObjects.get(0).properties.get(`name`) :
            `Не удалось определить адрес.`;
          point.address = address;
          // Меняет адрес в DOM
          changeDOMPoint(addressElem, point.address);
          // Меняет адрес в балуне
          myPlacemark.properties.set(`balloonContent`, point.address);
        });
      });
      renewZoom();
    })
  });
};

// После загрузки API и готовности DOM запускаем карту
ymaps.ready(init);

// popup.js - Prod v1.0

document.addEventListener('DOMContentLoaded', function () {
  const durusmaTableBody = document.getElementById('durusmaTableBody');
  const selectAllButton = document.getElementById('selectAll');
  const deselectAllButton = document.getElementById('deselectAll');
  const downloadIcsButton = document.getElementById('downloadIcs');
  const masterCheckbox = document.getElementById('masterCheckbox');
  const noDataMessage = document.getElementById('noDataMessage');
  const durusmaTableContainer = document.getElementById('durusmaTableContainer');
  
  // Hatırlatma ve alarm elementleri
  const reminderToggle = document.getElementById('reminderToggle');
  const alarmSettings = document.getElementById('alarmSettings');
  const alarmValue = document.getElementById('alarmValue');
  const alarmUnit = document.getElementById('alarmUnit');

  let durusmalar = [];

  // Hatırlatma toggle işlevselliği
  reminderToggle.addEventListener('change', function() {
    if (this.checked) {
      alarmSettings.classList.add('active');
    } else {
      alarmSettings.classList.remove('active');
    }
  });

  // Alarm değerlerini doğrulama ve sınırlama
  function validateAlarmSettings() {
    const value = parseInt(alarmValue.value);
    const unit = alarmUnit.value;
    
    if (isNaN(value) || value < 1) {
      alarmValue.value = 1;
      return { value: 1, unit: unit };
    }
    
    let maxValue;
    switch (unit) {
      case 'minutes':
        maxValue = 59;
        break;
      case 'hours':
        maxValue = 23;
        break;
      case 'days':
        maxValue = 7;
        break;
      default:
        maxValue = 1;
    }
    
    if (value > maxValue) {
      alarmValue.value = maxValue;
      return { value: maxValue, unit: unit };
    }
    
    return { value: value, unit: unit };
  }

  // Alarm ayarlarını ICS TRIGGER formatına çevir
  function getAlarmTrigger() {
    if (!reminderToggle.checked) {
      return null;
    }
    
    const settings = validateAlarmSettings();
    const { value, unit } = settings;
    
    switch (unit) {
      case 'minutes':
        return `-PT${value}M`;
      case 'hours':
        return `-PT${value}H`;
      case 'days':
        return `-P${value}D`;
      default:
        return '-PT1H';
    }
  }

  // Alarm input değişikliklerini dinle
  alarmValue.addEventListener('input', validateAlarmSettings);
  alarmUnit.addEventListener('change', validateAlarmSettings);

  // Duruşma verilerini tabloda gösterme fonksiyonu
  function displayDurusmalar(data) {
    durusmaTableBody.innerHTML = '';
    if (!data || data.length === 0) {
      noDataMessage.style.display = 'block';
      durusmaTableContainer.style.display = 'none';
      masterCheckbox.disabled = true;
      downloadIcsButton.disabled = true;
      selectAllButton.disabled = true;
      deselectAllButton.disabled = true;
      return;
    }

    noDataMessage.style.display = 'none';
    durusmaTableContainer.style.display = 'block';
    masterCheckbox.disabled = false;
    selectAllButton.disabled = false;
    deselectAllButton.disabled = false;

    durusmalar = data;

    data.forEach((durusma, index) => {
      const row = durusmaTableBody.insertRow();
      row.insertCell().innerHTML = `<input type="checkbox" class="durusma-checkbox" data-index="${index}">`;
      row.insertCell().textContent = durusma.yerelBirimAd || 'N/A';
      row.insertCell().textContent = durusma.dosyaNo || 'N/A';
      
      let formattedDisplayDate = 'N/A';
      if (durusma.tarihSaat) {
        try {
          let parsableDisplayDateString = durusma.tarihSaat.trim();
          if (parsableDisplayDateString.endsWith(".0")) {
            parsableDisplayDateString = parsableDisplayDateString.substring(0, parsableDisplayDateString.length - 2);
          }
          parsableDisplayDateString = parsableDisplayDateString.replace(" ", "T");

          const dateObj = new Date(parsableDisplayDateString);
          if (isNaN(dateObj.getTime())) {
            formattedDisplayDate = 'Geçersiz Tarih';
          } else {
            formattedDisplayDate = dateObj.toLocaleString('tr-TR', {
              year: 'numeric', month: '2-digit', day: '2-digit',
              hour: '2-digit', minute: '2-digit'
            });
          }
        } catch (e) {
          formattedDisplayDate = 'Hatalı Tarih';
        }
      }
      row.insertCell().textContent = formattedDisplayDate;
      row.insertCell().textContent = durusma.islemTuruAciklama || 'N/A';
    });
    updateMasterCheckboxState();
    updateDownloadButtonState();
  }

  // Seçili duruşmaları alır
  function getSelectedDurusmalar() {
    const selectedIndexes = [];
    document.querySelectorAll('.durusma-checkbox:checked').forEach(checkbox => {
      selectedIndexes.push(parseInt(checkbox.dataset.index));
    });
    return selectedIndexes.map(index => durusmalar[index]);
  }

  // ICS için tarih/saat formatını ayarlar
  function formatICSDateTimeLocal(dateString) {
    if (!dateString || typeof dateString !== 'string') {
      return null;
    }

    let cleanDateString = dateString.trim();
    if (cleanDateString.endsWith('.0')) {
      cleanDateString = cleanDateString.slice(0, -2);
    }

    const match = cleanDateString.match(/(\d{4})-(\d{2})-(\d{2})[\sT](\d{2}):(\d{2}):(\d{2})/);
    
    if (match && match.length === 7) {
      const [, year, month, day, hour, minute, second] = match;

      if (isNaN(parseInt(year)) || isNaN(parseInt(month)) || isNaN(parseInt(day)) ||
          isNaN(parseInt(hour)) || isNaN(parseInt(minute)) || isNaN(parseInt(second))) {
          return null;
      }

      const monthNum = parseInt(month);
      const dayNum = parseInt(day);
      const hourNum = parseInt(hour);
      const minuteNum = parseInt(minute);
      const secondNum = parseInt(second);

      if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31 || 
          hourNum < 0 || hourNum > 23 || minuteNum < 0 || minuteNum > 59 || 
          secondNum < 0 || secondNum > 59) {
          return null;
      }

      return `${year}${month}${day}T${hour}${minute}${second}`;
    } else {
      return null;
    }
  }

  // ICS etkinlikleri için benzersiz UID oluşturur
  function generateUID(durusma) {
    const birimAd = (durusma.yerelBirimAd || "").replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
    const dosyaNo = (durusma.dosyaNo || "").replace(/[^a-zA-Z0-9]/g, '');
    const tarihSaatStamp = (durusma.tarihSaat || "").replace(/[-:.\s]/g, '');
    const islemTuru = (durusma.islemTuruAciklama || "Duruşma").replace(/[^a-zA-Z0-9]/g, '');

    const uid = `${birimAd}-${dosyaNo}-${tarihSaatStamp}-${islemTuru}`;
    return uid.replace(/[^a-zA-Z0-9-.]/g, ''); 
  }

  // Alarm ayarları için açıklama metni oluştur
  function getAlarmDescription() {
    if (!reminderToggle.checked) {
      return null;
    }
    
    const settings = validateAlarmSettings();
    const { value, unit } = settings;
    
    let unitText;
    switch (unit) {
      case 'minutes':
        unitText = value === 1 ? 'dakika' : 'dakika';
        break;
      case 'hours':
        unitText = value === 1 ? 'saat' : 'saat';
        break;
      case 'days':
        unitText = value === 1 ? 'gün' : 'gün';
        break;
      default:
        unitText = 'saat';
    }
    
    return `Duruşma ${value} ${unitText} önce`;
  }

  // Manuel ICS oluşturma fonksiyonu
  function createManualICS(durusmalar) {
    const now = new Date();
    const dtstamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const alarmTrigger = getAlarmTrigger();
    const alarmDescription = getAlarmDescription();

    let icsContent = `BEGIN:VCALENDAR\r
PRODID:UYAP Duruşma Listesi Oluşturucu\r
VERSION:2.0\r
X-WR-TIMEZONE:Europe/Istanbul\r
X-WR-CALNAME:UYAP Duruşmalar\r
`;

    durusmalar.forEach(durusma => {
      const startDateLocal = formatICSDateTimeLocal(durusma.tarihSaat);
      
      if (!startDateLocal) {
        return;
      }

      let formattedDisplayDateForSummary = 'Tarih/Saat Yok';
      if (durusma.tarihSaat) {
        try {
          let cleanDate = durusma.tarihSaat.trim();
          if (cleanDate.endsWith('.0')) {
            cleanDate = cleanDate.slice(0, -2);
          }
          
          const dateObj = new Date(cleanDate.replace(" ", "T"));
          if (!isNaN(dateObj.getTime())) {
            formattedDisplayDateForSummary = ('0' + dateObj.getDate()).slice(-2) + '.' +
                                           ('0' + (dateObj.getMonth() + 1)).slice(-2) + '.' +
                                           dateObj.getFullYear() + ' ' +
                                           ('0' + dateObj.getHours()).slice(-2) + ':' +
                                           ('0' + dateObj.getMinutes()).slice(-2) + ':' +
                                           ('0' + dateObj.getSeconds()).slice(-2);
          }
        } catch (e) {
          // Hata durumunda varsayılan değer kullan
        }
      }

      const eventSummary = `${durusma.yerelBirimAd || 'N/A'} - ${durusma.dosyaNo || 'N/A'} - ${durusma.islemTuruAciklama || 'N/A'} - ${formattedDisplayDateForSummary}`;
      
      let eventDescription = (durusma.dosyaTaraflari || [])
        .map(taraf => {
          const adSoyad = `${taraf.isim || ''} ${taraf.soyad || ''}`.trim();
          return adSoyad ? `${adSoyad} - ${taraf.sifat || ''}`.trim() : '';
        })
        .filter(Boolean)
        .join(' // ');
      
      if (!eventDescription) eventDescription = "Taraf bilgisi bulunamadı.";

      const eventUID = generateUID(durusma);
      const location = durusma.yerelBirimAd || '';

      let eventContent = `BEGIN:VEVENT\r
UID:${eventUID}\r
DTSTAMP:${dtstamp}\r
DTSTART:${startDateLocal}\r
DTEND:${startDateLocal}\r
SUMMARY:${eventSummary}\r
LOCATION:${location}\r
DESCRIPTION:${eventDescription}\r
`;

      if (alarmTrigger && alarmDescription) {
        eventContent += `BEGIN:VALARM\r
TRIGGER:${alarmTrigger}\r
ACTION:DISPLAY\r
DESCRIPTION:${alarmDescription}\r
END:VALARM\r
`;
      }

      eventContent += `END:VEVENT\r
`;

      icsContent += eventContent;
    });

    icsContent += `END:VCALENDAR`;
    return icsContent;
  }

  // İndir düğmesine tıklanınca çalışır
  downloadIcsButton.addEventListener('click', () => {
    const selected = getSelectedDurusmalar();
    if (selected.length === 0) {
      alert("Lütfen en az bir duruşma seçin.");
      return;
    }

    const icsContent = createManualICS(selected);
    
    if (!icsContent) {
      alert("ICS dosyası oluşturulamadı.");
      return;
    }

    const now = new Date();
    const fileNameDate = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    chrome.downloads.download({
        url: url,
        filename: `durusma-listesi-${fileNameDate}.ics`,
        saveAs: true
    }, function(downloadId) {
        if (chrome.runtime.lastError) {
            alert("ICS dosyası indirilirken bir hata oluştu: " + chrome.runtime.lastError.message);
        }
    });
  });

  // Checkbox event listeners
  masterCheckbox.addEventListener('change', function() {
    document.querySelectorAll('.durusma-checkbox').forEach(checkbox => {
      checkbox.checked = this.checked;
    });
    updateDownloadButtonState();
  });

  selectAllButton.addEventListener('click', () => {
    masterCheckbox.checked = true;
    document.querySelectorAll('.durusma-checkbox').forEach(checkbox => checkbox.checked = true);
    updateDownloadButtonState();
  });

  deselectAllButton.addEventListener('click', () => {
    masterCheckbox.checked = false;
    document.querySelectorAll('.durusma-checkbox').forEach(checkbox => checkbox.checked = false);
    updateDownloadButtonState();
  });

  durusmaTableBody.addEventListener('change', (event) => {
    if (event.target.classList.contains('durusma-checkbox')) {
      updateMasterCheckboxState();
      updateDownloadButtonState();
    }
  });
  
  function updateMasterCheckboxState() {
    const checkboxes = document.querySelectorAll('.durusma-checkbox');
    if (checkboxes.length === 0) {
        masterCheckbox.checked = false;
        masterCheckbox.indeterminate = false;
        return;
    }
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    const someChecked = Array.from(checkboxes).some(cb => cb.checked);
    masterCheckbox.checked = allChecked;
    masterCheckbox.indeterminate = !allChecked && someChecked;
  }

  function updateDownloadButtonState() {
    const anyChecked = document.querySelectorAll('.durusma-checkbox:checked').length > 0;
    downloadIcsButton.disabled = !anyChecked;
  }

  // Popup açıldığında veri çekme
  chrome.runtime.sendMessage({ type: "GET_CAPTURED_DATA" }, (response) => {
    if (chrome.runtime.lastError) {
      displayDurusmalar(null);
    } else if (response && response.data) {
      displayDurusmalar(response.data);
    } else {
      displayDurusmalar(null);
    }
  });

  // Arka plan script'inden gelen veri güncelleme mesajlarını dinle
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "UYAP_DATA_UPDATED") {
        displayDurusmalar(request.payload);
    }
  });
});
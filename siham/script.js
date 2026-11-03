/**
 * Royal Palace Hotel - Main JavaScript
 * Vanilla JS handling UI interactions, responsive navigation, lightbox,
 * live pricing estimation, booking validation, testimonials carousel, and modals.
 */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    /* ==========================================================================
       1. Setup & Helper Functions
       ========================================================================== */
    const roomPrices = {
        standard: 180,
        deluxe: 280,
        suite: 450,
        penthouse: 850
    };

    const roomNames = {
        standard: 'Standard Room',
        deluxe: 'Deluxe Room',
        suite: 'Luxury Suite',
        penthouse: 'Presidential Penthouse'
    };

    // Format currency helper
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(amount);
    };

    // Toast Notification Utility
    const toast = document.getElementById('toastNotification');
    const toastMessage = document.getElementById('toastMessage');
    let toastTimeout = null;

    const showToast = (message, iconClass = 'fa-solid fa-circle-check') => {
        if (!toast || !toastMessage) return;
        if (toastTimeout) clearTimeout(toastTimeout);

        const icon = toast.querySelector('.toast-icon');
        if (icon) icon.className = `toast-icon ${iconClass}`;
        toastMessage.textContent = message;

        toast.classList.add('show');
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 4200);
    };

    // Set Copyright Year
    const yearSpan = document.getElementById('currentYear');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    /* ==========================================================================
       2. Sticky Header & Mobile Navigation Menu
       ========================================================================== */
    const header = document.getElementById('header');
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');
    const navLinks = document.querySelectorAll('.nav-link');

    // Sticky header background transition
    const handleScrollHeader = () => {
        if (window.scrollY > 40) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    };
    window.addEventListener('scroll', handleScrollHeader, { passive: true });
    handleScrollHeader();

    // Toggle Mobile Menu
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            const isOpen = navMenu.classList.toggle('active');
            hamburger.classList.toggle('active');
            hamburger.setAttribute('aria-expanded', isOpen);
            document.body.style.overflow = isOpen ? 'hidden' : '';
        });

        // Close on link click
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                hamburger.classList.remove('active');
                hamburger.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            });
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (navMenu.classList.contains('active') &&
                !navMenu.contains(e.target) &&
                !hamburger.contains(e.target)) {
                navMenu.classList.remove('active');
                hamburger.classList.remove('active');
                hamburger.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            }
        });
    }

    /* ==========================================================================
       3. Active Nav Link on Scroll (Scrollspy)
       ========================================================================== */
    const sections = document.querySelectorAll('section[id], header[id]');

    const highlightActiveNav = () => {
        const scrollPosition = window.scrollY + 140;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');

            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    };
    window.addEventListener('scroll', highlightActiveNav, { passive: true });

    /* ==========================================================================
       4. Date Management & Date Picker Defaults
       ========================================================================== */
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const defaultCheckOut = new Date();
    defaultCheckOut.setDate(tomorrow.getDate() + 3);

    const formatDateInput = (date) => {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    // Quick Booking Form inputs
    const quickCheckIn = document.getElementById('quickCheckIn');
    const quickCheckOut = document.getElementById('quickCheckOut');
    const quickRoomType = document.getElementById('quickRoomType');
    const quickGuests = document.getElementById('quickGuests');
    const quickForm = document.getElementById('quickBookingForm');

    // Main Booking Form inputs
    const mainCheckIn = document.getElementById('checkInDate');
    const mainCheckOut = document.getElementById('checkOutDate');
    const roomSelect = document.getElementById('roomSelect');
    const numGuests = document.getElementById('numGuests');
    const hotelBookingForm = document.getElementById('hotelBookingForm');
    const calcNights = document.getElementById('calcNights');
    const calcTotal = document.getElementById('calcTotal');

    // Set min dates and defaults
    const todayStr = formatDateInput(today);
    const tomorrowStr = formatDateInput(tomorrow);
    const defaultCheckOutStr = formatDateInput(defaultCheckOut);

    if (quickCheckIn && quickCheckOut) {
        quickCheckIn.min = todayStr;
        quickCheckIn.value = tomorrowStr;
        quickCheckOut.min = tomorrowStr;
        quickCheckOut.value = defaultCheckOutStr;
    }

    if (mainCheckIn && mainCheckOut) {
        mainCheckIn.min = todayStr;
        mainCheckIn.value = tomorrowStr;
        mainCheckOut.min = tomorrowStr;
        mainCheckOut.value = defaultCheckOutStr;
    }

    // Update check-out minimum whenever check-in changes
    const syncCheckInChange = (checkInElem, checkOutElem) => {
        if (!checkInElem || !checkOutElem) return;
        checkInElem.addEventListener('change', () => {
            const checkInVal = new Date(checkInElem.value);
            if (!isNaN(checkInVal.getTime())) {
                const nextDay = new Date(checkInVal);
                nextDay.setDate(checkInVal.getDate() + 1);
                checkOutElem.min = formatDateInput(nextDay);
                if (new Date(checkOutElem.value) <= checkInVal) {
                    checkOutElem.value = formatDateInput(nextDay);
                }
            }
            updateCostEstimate();
        });
        checkOutElem.addEventListener('change', updateCostEstimate);
    };

    syncCheckInChange(quickCheckIn, quickCheckOut);
    syncCheckInChange(mainCheckIn, mainCheckOut);

    /* ==========================================================================
       5. Live Stay & Cost Estimator
       ========================================================================== */
    function updateCostEstimate() {
        if (!mainCheckIn || !mainCheckOut || !roomSelect || !calcNights || !calcTotal) return;

        const checkIn = new Date(mainCheckIn.value);
        const checkOut = new Date(mainCheckOut.value);
        const roomType = roomSelect.value || 'deluxe';

        if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
            calcNights.textContent = '0 Nights';
            calcTotal.textContent = '$0 USD';
            return;
        }

        const timeDiff = checkOut.getTime() - checkIn.getTime();
        const nights = Math.max(1, Math.ceil(timeDiff / (1000 * 3600 * 24)));
        const nightlyRate = roomPrices[roomType] || 280;
        const total = nights * nightlyRate;

        calcNights.textContent = `${nights} ${nights === 1 ? 'Night' : 'Nights'}`;
        calcTotal.textContent = `${formatCurrency(total)} USD`;
    }

    if (roomSelect) {
        roomSelect.addEventListener('change', updateCostEstimate);
    }
    updateCostEstimate();

    /* ==========================================================================
       6. Quick Booking Bar Submission -> Sync to Main Form
       ========================================================================== */
    if (quickForm) {
        quickForm.addEventListener('submit', (e) => {
            e.preventDefault();

            if (mainCheckIn && quickCheckIn) mainCheckIn.value = quickCheckIn.value;
            if (mainCheckOut && quickCheckOut) mainCheckOut.value = quickCheckOut.value;
            if (roomSelect && quickRoomType) roomSelect.value = quickRoomType.value;
            if (numGuests && quickGuests) numGuests.value = quickGuests.value;

            updateCostEstimate();

            const bookingSection = document.getElementById('booking');
            if (bookingSection) {
                bookingSection.scrollIntoView({ behavior: 'smooth' });
                showToast(`Transferred details for ${roomNames[quickRoomType.value] || 'your suite'}.`);
            }
        });
    }

    /* ==========================================================================
       7. Room Cards "Book Now" Button Triggers
       ========================================================================== */
    const bookRoomButtons = document.querySelectorAll('.btn-book-room');
    bookRoomButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const roomType = e.currentTarget.getAttribute('data-room');
            const roomName = e.currentTarget.getAttribute('data-room-name');

            if (roomSelect && roomType) {
                roomSelect.value = roomType;
                updateCostEstimate();
            }

            const bookingSection = document.getElementById('booking');
            if (bookingSection) {
                bookingSection.scrollIntoView({ behavior: 'smooth' });
            }

            showToast(`Selected ${roomName}! Complete your reservation below.`, 'fa-solid fa-bed');
        });
    });

    /* ==========================================================================
       8. Interactive Booking Form Validation & Submission
       ========================================================================== */
    const guestName = document.getElementById('guestName');
    const guestEmail = document.getElementById('guestEmail');
    const guestPhone = document.getElementById('guestPhone');
    const submitBookingBtn = document.getElementById('submitBookingBtn');
    const confirmationModal = document.getElementById('confirmationModal');
    const confirmationDetails = document.getElementById('confirmationDetails');
    const confirmModalClose = document.getElementById('confirmModalClose');
    const confirmDoneBtn = document.getElementById('confirmDoneBtn');

    // Error message helpers
    const setError = (elementId, message) => {
        const errElem = document.getElementById(elementId);
        if (errElem) errElem.textContent = message;
    };

    const clearErrors = () => {
        const errorElems = document.querySelectorAll('.booking-form .error-msg');
        errorElems.forEach(el => el.textContent = '');
        const inputs = document.querySelectorAll('.booking-form .input-error');
        inputs.forEach(el => el.classList.remove('input-error'));
    };

    // Live error clearing on input
    [guestName, guestEmail, guestPhone, mainCheckIn, mainCheckOut, roomSelect, numGuests].forEach(input => {
        if (!input) return;
        input.addEventListener('input', () => {
            input.classList.remove('input-error');
            const errorElem = document.getElementById(`${input.id}Error`);
            if (errorElem) errorElem.textContent = '';
        });
    });

    if (hotelBookingForm) {
        hotelBookingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            clearErrors();

            let isValid = true;

            // Name validation
            if (!guestName.value.trim()) {
                setError('guestNameError', 'Please enter your full name.');
                guestName.classList.add('input-error');
                isValid = false;
            } else if (guestName.value.trim().length < 3) {
                setError('guestNameError', 'Name must be at least 3 characters.');
                guestName.classList.add('input-error');
                isValid = false;
            }

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!guestEmail.value.trim()) {
                setError('guestEmailError', 'Please provide your email address.');
                guestEmail.classList.add('input-error');
                isValid = false;
            } else if (!emailRegex.test(guestEmail.value.trim())) {
                setError('guestEmailError', 'Please enter a valid email address.');
                guestEmail.classList.add('input-error');
                isValid = false;
            }

            // Phone validation
            const phoneVal = guestPhone.value.trim().replace(/\D/g, '');
            if (!guestPhone.value.trim()) {
                setError('guestPhoneError', 'Please enter a contact phone number.');
                guestPhone.classList.add('input-error');
                isValid = false;
            } else if (phoneVal.length < 7) {
                setError('guestPhoneError', 'Phone number must contain at least 7 digits.');
                guestPhone.classList.add('input-error');
                isValid = false;
            }

            // Room validation
            if (!roomSelect.value) {
                setError('roomSelectError', 'Please select a room type.');
                roomSelect.classList.add('input-error');
                isValid = false;
            }

            // Date validation
            const checkInDate = new Date(mainCheckIn.value);
            const checkOutDate = new Date(mainCheckOut.value);

            if (isNaN(checkInDate.getTime())) {
                setError('checkInError', 'Please choose a check-in date.');
                mainCheckIn.classList.add('input-error');
                isValid = false;
            }

            if (isNaN(checkOutDate.getTime())) {
                setError('checkOutError', 'Please choose a check-out date.');
                mainCheckOut.classList.add('input-error');
                isValid = false;
            } else if (checkOutDate <= checkInDate) {
                setError('checkOutError', 'Check-out date must be after check-in.');
                mainCheckOut.classList.add('input-error');
                isValid = false;
            }

            if (!isValid) return;

            // Show loading state
            const btnText = submitBookingBtn.querySelector('.btn-text');
            const btnLoader = submitBookingBtn.querySelector('.btn-loader');
            if (btnText && btnLoader) {
                btnText.style.display = 'none';
                btnLoader.style.display = 'inline-flex';
                submitBookingBtn.disabled = true;
            }

            // Simulate booking confirmation API call
            setTimeout(() => {
                // Restore button state
                if (btnText && btnLoader) {
                    btnText.style.display = 'inline-flex';
                    btnLoader.style.display = 'none';
                    submitBookingBtn.disabled = false;
                }

                // Generate booking confirmation
                const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
                const nights = Math.max(1, Math.ceil(timeDiff / (1000 * 3600 * 24)));
                const roomTypeKey = roomSelect.value;
                const pricePerNight = roomPrices[roomTypeKey] || 280;
                const totalCost = nights * pricePerNight;
                const refCode = `RP-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

                if (confirmationDetails) {
                    confirmationDetails.innerHTML = `
                        <div class="confirmation-card">
                            <div class="confirmation-row">
                                <span class="conf-label">Booking Reference:</span>
                                <span class="conf-value conf-ref">${refCode}</span>
                            </div>
                            <div class="confirmation-row">
                                <span class="conf-label">Primary Guest:</span>
                                <span class="conf-value">${guestName.value.trim()}</span>
                            </div>
                            <div class="confirmation-row">
                                <span class="conf-label">Email Confirmation:</span>
                                <span class="conf-value">${guestEmail.value.trim()}</span>
                            </div>
                            <div class="confirmation-row">
                                <span class="conf-label">Room Category:</span>
                                <span class="conf-value">${roomNames[roomTypeKey] || 'Deluxe Suite'}</span>
                            </div>
                            <div class="confirmation-row">
                                <span class="conf-label">Dates:</span>
                                <span class="conf-value">${mainCheckIn.value} to ${mainCheckOut.value} (${nights} nights)</span>
                            </div>
                            <div class="confirmation-row">
                                <span class="conf-label">Guests:</span>
                                <span class="conf-value">${numGuests.value} Guest(s)</span>
                            </div>
                            <div class="confirmation-row">
                                <span class="conf-label">Total Amount:</span>
                                <span class="conf-value total-highlight">${formatCurrency(totalCost)} USD</span>
                            </div>
                        </div>
                        <p style="margin-top: 1.25rem; font-size: 0.88rem; color: var(--slate-400); text-align: center;">
                            A confirmation letter and welcome itinerary have been transmitted to <strong>${guestEmail.value.trim()}</strong>. Our concierge looks forward to welcoming you!
                        </p>
                    `;
                }

                if (confirmationModal) {
                    confirmationModal.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }

                hotelBookingForm.reset();
                if (mainCheckIn && mainCheckOut) {
                    mainCheckIn.value = tomorrowStr;
                    mainCheckOut.value = defaultCheckOutStr;
                }
                updateCostEstimate();
                showToast(`Reservation ${refCode} successfully created!`);
            }, 900);
        });
    }

    // Close Confirmation Modal
    const closeConfirmModal = () => {
        if (confirmationModal) {
            confirmationModal.classList.remove('active');
            document.body.style.overflow = '';
        }
    };

    if (confirmModalClose) confirmModalClose.addEventListener('click', closeConfirmModal);
    if (confirmDoneBtn) confirmDoneBtn.addEventListener('click', closeConfirmModal);
    if (confirmationModal) {
        confirmationModal.addEventListener('click', (e) => {
            if (e.target === confirmationModal) closeConfirmModal();
        });
    }

    /* ==========================================================================
       9. Gallery Filtering & Interactive Lightbox Modal
       ========================================================================== */
    const filterButtons = document.querySelectorAll('.gallery-filter-btn');
    const galleryItems = Array.from(document.querySelectorAll('.gallery-item'));
    const lightboxModal = document.getElementById('lightboxModal');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxCaption = document.getElementById('lightboxCaption');
    const lightboxClose = document.getElementById('lightboxClose');
    const lightboxPrev = document.getElementById('lightboxPrev');
    const lightboxNext = document.getElementById('lightboxNext');

    let currentVisibleItems = [...galleryItems];
    let currentLightboxIndex = 0;

    // Filter Buttons
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filterValue = btn.getAttribute('data-filter');

            galleryItems.forEach(item => {
                const category = item.getAttribute('data-category');
                if (filterValue === 'all' || category === filterValue) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });

            currentVisibleItems = galleryItems.filter(item => item.style.display !== 'none');
        });
    });

    // Open Lightbox
    const openLightbox = (index) => {
        if (!currentVisibleItems[index]) return;
        currentLightboxIndex = index;
        const item = currentVisibleItems[index];
        const img = item.querySelector('img');
        const caption = item.getAttribute('data-caption') || img.alt;

        if (lightboxImg) lightboxImg.src = img.src;
        if (lightboxCaption) lightboxCaption.textContent = caption;

        lightboxModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    // Click handler on gallery items
    galleryItems.forEach(item => {
        item.addEventListener('click', () => {
            const index = currentVisibleItems.indexOf(item);
            if (index !== -1) openLightbox(index);
        });
    });

    // Prev / Next Lightbox Controls
    const showPrevLightbox = () => {
        currentLightboxIndex = (currentLightboxIndex - 1 + currentVisibleItems.length) % currentVisibleItems.length;
        openLightbox(currentLightboxIndex);
    };

    const showNextLightbox = () => {
        currentLightboxIndex = (currentLightboxIndex + 1) % currentVisibleItems.length;
        openLightbox(currentLightboxIndex);
    };

    const closeLightbox = () => {
        if (lightboxModal) {
            lightboxModal.classList.remove('active');
            document.body.style.overflow = '';
        }
    };

    if (lightboxPrev) lightboxPrev.addEventListener('click', showPrevLightbox);
    if (lightboxNext) lightboxNext.addEventListener('click', showNextLightbox);
    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);

    if (lightboxModal) {
        lightboxModal.addEventListener('click', (e) => {
            if (e.target === lightboxModal) closeLightbox();
        });
    }

    // Keyboard navigation for lightbox
    document.addEventListener('keydown', (e) => {
        if (!lightboxModal || !lightboxModal.classList.contains('active')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') showPrevLightbox();
        if (e.key === 'ArrowRight') showNextLightbox();
    });

    /* ==========================================================================
       10. Testimonials Carousel / Slider
       ========================================================================== */
    const testimonialCards = document.querySelectorAll('.testimonial-card');
    const dots = document.querySelectorAll('.slider-dots .dot');
    const prevBtn = document.getElementById('prevTestimonial');
    const nextBtn = document.getElementById('nextTestimonial');
    const sliderContainer = document.querySelector('.testimonials-slider-container');

    let currentSlide = 0;
    let autoSlideInterval = null;

    const setSlide = (index) => {
        testimonialCards.forEach((card, i) => {
            card.classList.toggle('active', i === index);
        });
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
        currentSlide = index;
    };

    const nextSlide = () => {
        const next = (currentSlide + 1) % testimonialCards.length;
        setSlide(next);
    };

    const prevSlide = () => {
        const prev = (currentSlide - 1 + testimonialCards.length) % testimonialCards.length;
        setSlide(prev);
    };

    if (nextBtn) nextBtn.addEventListener('click', nextSlide);
    if (prevBtn) prevBtn.addEventListener('click', prevSlide);

    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => setSlide(index));
    });

    // Auto rotate every 6 seconds
    const startAutoSlide = () => {
        if (autoSlideInterval) clearInterval(autoSlideInterval);
        autoSlideInterval = setInterval(nextSlide, 6000);
    };

    const stopAutoSlide = () => {
        if (autoSlideInterval) clearInterval(autoSlideInterval);
    };

    if (sliderContainer) {
        sliderContainer.addEventListener('mouseenter', stopAutoSlide);
        sliderContainer.addEventListener('mouseleave', startAutoSlide);
        startAutoSlide();
    }

    /* ==========================================================================
       11. About "Read More" Modal
       ========================================================================== */
    const readMoreBtn = document.getElementById('readMoreBtn');
    const aboutModal = document.getElementById('aboutModal');
    const aboutModalClose = document.getElementById('aboutModalClose');
    const aboutModalCloseBtn = document.getElementById('aboutModalCloseBtn');
    const aboutModalBookBtn = document.getElementById('aboutModalBookBtn');

    const openAboutModal = () => {
        if (aboutModal) {
            aboutModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    };

    const closeAboutModal = () => {
        if (aboutModal) {
            aboutModal.classList.remove('active');
            document.body.style.overflow = '';
        }
    };

    if (readMoreBtn) readMoreBtn.addEventListener('click', openAboutModal);
    if (aboutModalClose) aboutModalClose.addEventListener('click', closeAboutModal);
    if (aboutModalCloseBtn) aboutModalCloseBtn.addEventListener('click', closeAboutModal);

    if (aboutModalBookBtn) {
        aboutModalBookBtn.addEventListener('click', () => {
            closeAboutModal();
        });
    }

    if (aboutModal) {
        aboutModal.addEventListener('click', (e) => {
            if (e.target === aboutModal) closeAboutModal();
        });
    }

    /* ==========================================================================
       12. Contact Form & Newsletter Validation
       ========================================================================== */
    const contactForm = document.getElementById('contactForm');
    const contactName = document.getElementById('contactName');
    const contactEmail = document.getElementById('contactEmail');
    const contactMessage = document.getElementById('contactMessage');

    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            let isValid = true;

            const nameErr = document.getElementById('contactNameError');
            const emailErr = document.getElementById('contactEmailError');
            const msgErr = document.getElementById('contactMessageError');

            if (nameErr) nameErr.textContent = '';
            if (emailErr) emailErr.textContent = '';
            if (msgErr) msgErr.textContent = '';

            if (!contactName.value.trim()) {
                if (nameErr) nameErr.textContent = 'Please enter your name.';
                isValid = false;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!contactEmail.value.trim() || !emailRegex.test(contactEmail.value.trim())) {
                if (emailErr) emailErr.textContent = 'Please enter a valid email address.';
                isValid = false;
            }

            if (!contactMessage.value.trim()) {
                if (msgErr) msgErr.textContent = 'Please provide your inquiry message.';
                isValid = false;
            }

            if (!isValid) return;

            showToast('Thank you! Your royal inquiry has been received. Our concierge will reply shortly.');
            contactForm.reset();
        });
    }

    // Newsletter Form
    const newsletterForm = document.getElementById('newsletterForm');
    const newsletterEmail = document.getElementById('newsletterEmail');

    if (newsletterForm && newsletterEmail) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (emailRegex.test(newsletterEmail.value.trim())) {
                showToast('Welcome to the Royal Palace VIP Circle! Enjoy your 15% booking privilege.');
                newsletterForm.reset();
            } else {
                showToast('Please enter a valid email address for membership.', 'fa-solid fa-circle-exclamation');
            }
        });
    }

    /* ==========================================================================
       13. Floating Back to Top Button
       ========================================================================== */
    const backToTopBtn = document.getElementById('backToTop');

    const toggleBackToTop = () => {
        if (!backToTopBtn) return;
        if (window.scrollY > 450) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    };

    window.addEventListener('scroll', toggleBackToTop, { passive: true });

    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
});

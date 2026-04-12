class JobPostings extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.allPostings = JobPostings.getJobPostings();
        this.filter = '';
        this.render();
    }

    static getJobPostings() {
        return [
            {
                title: '[한솔제지] 2023년 하반기 신입사원 채용',
                period: '2023-10-26 ~ 2023-11-07',
                dDay: 'D-5',
                type: '신입'
            },
            {
                title: '[한솔홈데코] 2023년 하반기 신입사원 채용',
                period: '2023-10-26 ~ 2023-11-07',
                dDay: 'D-5',
                type: '신입'
            },
            {
                title: '[한솔테크닉스] 2023년 하반기 신입사원 채용',
                period: '2023-10-26 ~ 2023-11-07',
                dDay: 'D-5',
                type: '신입'
            },
             {
                title: '[한솔로지스틱스] 2023년 하반기 신입사원 채용',
                period: '2023-10-26 ~ 2023-11-07',
                dDay: 'D-5',
                type: '신입'
            },
            {
                title: '[한솔PNS] 2023년 하반기 신입사원 채용',
                period: '2023-10-26 ~ 2023-11-07',
                dDay: 'D-5',
                type: '신입'
            },
            {
                title: '[한솔인티큐브] 2023년 하반기 신입사원 채용',
                period: '2023-10-26 ~ 2023-11-07',
                dDay: 'D-5',
                type: '신입'
            },
        ];
    }

    render(filter = '') {
        const filteredPostings = this.allPostings.filter(post => 
            post.title.toLowerCase().includes(filter.toLowerCase())
        );

        this.shadowRoot.innerHTML = `
            <style>
                .job-postings-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 1.5rem;
                    padding: 2rem 0;
                }
                .job-card {
                    background-color: var(--card-background-color, #fff);
                    border: 1px solid var(--card-border-color, #ddd);
                    border-radius: 8px;
                    padding: 1.5rem;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                    transition: transform 0.2s;
                }
                .job-card:hover {
                    transform: translateY(-5px);
                }
                .job-card h3 {
                    font-size: 1.25rem;
                    margin: 0 0 1rem 0;
                }
                .job-card p {
                    margin: 0.25rem 0;
                    color: #555;
                }
                .job-card .d-day {
                    color: var(--primary-color, #007bff);
                    font-weight: bold;
                }
                .job-card .type {
                    display: inline-block;
                    background-color: #eee;
                    padding: 0.25rem 0.5rem;
                    border-radius: 4px;
                    font-size: 0.875rem;
                }
                 .no-results {
                    text-align: center;
                    padding: 2rem;
                    font-size: 1.2rem;
                    color: #777;
                }
            </style>
            <div class="job-postings-grid">
                ${filteredPostings.length > 0 ? filteredPostings.map(post => `
                    <div class="job-card">
                        <h3>${post.title}</h3>
                        <p>${post.period}</p>
                        <p class="d-day">${post.dDay}</p>
                        <p class="type">${post.type}</p>
                    </div>
                `).join('') : '<div class="no-results">검색 결과가 없습니다.</div>'}
            </div>
        `;
    }
}

customElements.define('job-postings', JobPostings);

document.addEventListener('DOMContentLoaded', () => {
    const searchButton = document.getElementById('searchButton');
    const searchInput = document.getElementById('searchInput');
    const jobPostings = document.querySelector('job-postings');

    searchButton.addEventListener('click', () => {
        jobPostings.render(searchInput.value);
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            jobPostings.render(searchInput.value);
        }
    });
});
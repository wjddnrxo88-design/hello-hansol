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
                :host {
                    display: block;
                    --primary: #00529b;
                    --text: #1e293b;
                    --text-light: #64748b;
                    --bg-card: #ffffff;
                    --border: rgba(0, 0, 0, 0.05);
                    --shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                }

                .job-postings-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
                    gap: 2rem;
                    padding: 2rem 0;
                }

                .job-card {
                    background-color: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 16px;
                    padding: 2rem;
                    box-shadow: var(--shadow);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }

                .job-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 4px;
                    height: 100%;
                    background-color: var(--primary);
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }

                .job-card:hover {
                    transform: translateY(-8px);
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                }

                .job-card:hover::before {
                    opacity: 1;
                }

                .job-card h3 {
                    font-size: 1.25rem;
                    font-weight: 700;
                    margin: 0 0 1rem 0;
                    line-height: 1.4;
                    color: var(--text);
                }

                .info-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    margin-bottom: 1.5rem;
                }

                .info-item {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.9rem;
                    color: var(--text-light);
                }

                .badge-group {
                    display: flex;
                    gap: 0.75rem;
                    align-items: center;
                }

                .d-day {
                    background-color: #fee2e2;
                    color: #ef4444;
                    padding: 0.25rem 0.75rem;
                    border-radius: 9999px;
                    font-weight: 700;
                    font-size: 0.8rem;
                }

                .type {
                    background-color: #f1f5f9;
                    color: #475569;
                    padding: 0.25rem 0.75rem;
                    border-radius: 9999px;
                    font-size: 0.8rem;
                    font-weight: 600;
                }

                .no-results {
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 5rem 2rem;
                    background: white;
                    border-radius: 20px;
                    color: var(--text-light);
                    font-size: 1.1rem;
                    box-shadow: var(--shadow);
                }
            </style>
            <div class="job-postings-grid">
                ${filteredPostings.length > 0 ? filteredPostings.map(post => `
                    <div class="job-card">
                        <div>
                            <div class="badge-group" style="margin-bottom: 1rem;">
                                <span class="d-day">${post.dDay}</span>
                                <span class="type">${post.type}</span>
                            </div>
                            <h3>${post.title}</h3>
                        </div>
                        <div class="info-group">
                            <div class="info-item">
                                <span>📅</span>
                                <span>${post.period}</span>
                            </div>
                        </div>
                    </div>
                `).join('') : '<div class="no-results">검색 결과가 없습니다. 다시 시도해 주세요.</div>'}
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
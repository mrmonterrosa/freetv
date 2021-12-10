export interface M3UResponse {
    list: M3uList;
}

export interface M3uList {
    service: string;
    title:   string;
    item:    Item[];
}

export interface Item {
    service?:      string;
    title?:        string;
    playlistURL?:  string;
    media_url?:    string;
    url?:          string;
    author?:       string;
    language?:    string;
    country?:     string;
    id?:          string;
    thumb_square?: string;
    group?:        string;
}
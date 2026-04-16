import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Concept,
  ConceptListItem,
  CreateConceptPayload,
  UpdateConceptPayload,
  Snippet,
  CreateSnippetPayload,
  UpdateSnippetPayload,
} from '../models/concept.model';

@Injectable({ providedIn: 'root' })
export class ConceptService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/concepts`;

  getConcepts(): Observable<ConceptListItem[]> {
    return this.http.get<ConceptListItem[]>(this.baseUrl);
  }

  getConcept(id: string): Observable<Concept> {
    return this.http.get<Concept>(`${this.baseUrl}/${id}`);
  }

  createConcept(data: CreateConceptPayload): Observable<Concept> {
    return this.http.post<Concept>(this.baseUrl, data);
  }

  updateConcept(id: string, data: UpdateConceptPayload): Observable<Concept> {
    return this.http.put<Concept>(`${this.baseUrl}/${id}`, data);
  }

  deleteConcept(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  addSnippet(conceptId: string, data: CreateSnippetPayload): Observable<Snippet> {
    return this.http.post<Snippet>(`${this.baseUrl}/${conceptId}/snippets`, data);
  }

  updateSnippet(snippetId: string, data: UpdateSnippetPayload): Observable<Snippet> {
    return this.http.put<Snippet>(`${environment.apiUrl}/snippets/${snippetId}`, data);
  }

  deleteSnippet(snippetId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/snippets/${snippetId}`);
  }
}

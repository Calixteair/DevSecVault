<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\Concept;
use App\Entity\Snippet;
use App\Entity\Tag;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * One-shot seeder: populate the vault with classic CS concepts (sorting,
 * linked lists, networking, etc.) attached to a given owner.
 *
 * Idempotent per-title: a concept with the same title owned by the same user
 * is removed before re-insertion (cascades snippets). Tags are reused if they
 * already exist.
 *
 * Meilisearch sync happens automatically via SnippetIndexListener — no need
 * to trigger a manual reindex.
 */
#[AsCommand(
    name: 'app:seed:concepts',
    description: 'Seed public Dev Library concepts (sorting, linked lists, networking, ...) under a given owner.'
)]
class SeedConceptsCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $em,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('owner', null, InputOption::VALUE_REQUIRED, 'Owner username (must exist in users table)', 'calixteair')
            ->addOption('dry-run', null, InputOption::VALUE_NONE, 'Print what would be inserted, do not write');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $username = (string) $input->getOption('owner');
        $dryRun = (bool) $input->getOption('dry-run');

        $owner = $this->em->getRepository(User::class)->findOneBy(['username' => $username]);
        if ($owner === null) {
            $io->error(sprintf('Owner "%s" not found. Sync with Keycloak first (login once).', $username));
            return Command::FAILURE;
        }

        $io->title(sprintf('Seeding concepts for %s (%s)', $owner->getUsername(), $owner->getEmail()));

        $concepts = $this->conceptDefinitions();
        $io->writeln(sprintf('Preparing %d concept(s)...', count($concepts)));

        if ($dryRun) {
            foreach ($concepts as $c) {
                $io->writeln(sprintf(' - %s [%s] (%d snippets)', $c['title'], implode(',', $c['tags']), count($c['snippets'])));
            }
            $io->warning('Dry-run: no write performed.');
            return Command::SUCCESS;
        }

        $created = 0;
        foreach ($concepts as $def) {
            $this->removeExisting($owner, $def['title']);

            $concept = new Concept();
            $concept->setOwner($owner);
            $concept->setTitle($def['title']);
            $concept->setDescription($def['description']);
            $concept->setVisibility('public');

            foreach ($def['tags'] as $tagName) {
                $concept->addTag($this->resolveTag($tagName));
            }

            $sortOrder = 0;
            foreach ($def['snippets'] as $language => $code) {
                $s = new Snippet();
                $s->setLanguage($language);
                $s->setCode($code);
                $s->setSortOrder($sortOrder++);
                $concept->addSnippet($s);
            }

            $this->em->persist($concept);
            $created++;
        }

        $this->em->flush();

        $io->success(sprintf('%d concept(s) seeded. Meilisearch sync triggered via lifecycle listener.', $created));
        return Command::SUCCESS;
    }

    private function removeExisting(User $owner, string $title): void
    {
        $existing = $this->em->getRepository(Concept::class)->findBy([
            'owner' => $owner,
            'title' => $title,
        ]);
        foreach ($existing as $c) {
            $this->em->remove($c);
        }
        if (!empty($existing)) {
            $this->em->flush();
        }
    }

    private function resolveTag(string $name): Tag
    {
        $name = strtolower(trim($name));
        $tag = $this->em->getRepository(Tag::class)->findOneBy(['name' => $name]);
        if ($tag !== null) {
            return $tag;
        }
        $tag = new Tag();
        $tag->setName($name);
        $tag->setIsOfficial(true);
        $this->em->persist($tag);
        $this->em->flush();
        return $tag;
    }

    /**
     * @return list<array{title: string, description: string, tags: list<string>, snippets: array<string,string>}>
     */
    private function conceptDefinitions(): array
    {
        return [
            $this->quickSort(),
            $this->bubbleSort(),
            $this->insertionSort(),
            $this->selectionSort(),
            $this->heapSort(),
            $this->singlyLinkedList(),
            $this->doublyLinkedList(),
            $this->cycleDetection(),
            $this->tcpEchoClientServer(),
            $this->tcpMultiClientServer(),
            $this->udpEchoClientServer(),
            $this->binarySearch(),
            $this->binaryTreeTraversal(),
            $this->bstOperations(),
            $this->graphTraversal(),
            $this->dijkstra(),
            $this->stackAndQueue(),
            $this->hashTable(),
            $this->fibonacci(),
            $this->producerConsumer(),
            $this->threadPool(),
            $this->httpRequestRaw(),
            $this->xorCaesarCipher(),
        ];
    }

    private function quickSort(): array
    {
        return [
            'title' => 'Tri Rapide (Quick Sort)',
            'description' => 'Tri par partitionnement autour d\'un pivot. Complexite moyenne O(n log n), pire cas O(n^2). In-place.',
            'tags' => ['algorithme', 'tri', 'recursion', 'diviser-pour-regner'],
            'snippets' => [
                'python' => <<<'PY'
def quick_sort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    gauche = [x for x in arr if x < pivot]
    milieu = [x for x in arr if x == pivot]
    droite = [x for x in arr if x > pivot]
    return quick_sort(gauche) + milieu + quick_sort(droite)


if __name__ == "__main__":
    print(quick_sort([3, 6, 1, 8, 2, 9, 4]))
PY,
                'java' => <<<'JAVA'
import java.util.Arrays;

public class QuickSort {
    public static void sort(int[] a, int lo, int hi) {
        if (lo >= hi) return;
        int pivot = a[(lo + hi) >>> 1];
        int i = lo, j = hi;
        while (i <= j) {
            while (a[i] < pivot) i++;
            while (a[j] > pivot) j--;
            if (i <= j) {
                int tmp = a[i]; a[i] = a[j]; a[j] = tmp;
                i++; j--;
            }
        }
        sort(a, lo, j);
        sort(a, i, hi);
    }

    public static void main(String[] args) {
        int[] a = {3, 6, 1, 8, 2, 9, 4};
        sort(a, 0, a.length - 1);
        System.out.println(Arrays.toString(a));
    }
}
JAVA,
                'c' => <<<'C'
#include <stdio.h>

static void swap(int *a, int *b) { int t = *a; *a = *b; *b = t; }

static int partition(int *arr, int lo, int hi) {
    int pivot = arr[hi];
    int i = lo - 1;
    for (int j = lo; j < hi; j++) {
        if (arr[j] <= pivot) swap(&arr[++i], &arr[j]);
    }
    swap(&arr[i + 1], &arr[hi]);
    return i + 1;
}

void quick_sort(int *arr, int lo, int hi) {
    if (lo < hi) {
        int p = partition(arr, lo, hi);
        quick_sort(arr, lo, p - 1);
        quick_sort(arr, p + 1, hi);
    }
}

int main(void) {
    int arr[] = {3, 6, 1, 8, 2, 9, 4};
    int n = sizeof(arr) / sizeof(arr[0]);
    quick_sort(arr, 0, n - 1);
    for (int i = 0; i < n; i++) printf("%d ", arr[i]);
    printf("\n");
    return 0;
}
C,
                'javascript' => <<<'JS'
function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const pivot = arr[Math.floor(arr.length / 2)];
  const gauche = arr.filter(x => x < pivot);
  const milieu = arr.filter(x => x === pivot);
  const droite = arr.filter(x => x > pivot);
  return [...quickSort(gauche), ...milieu, ...quickSort(droite)];
}

console.log(quickSort([3, 6, 1, 8, 2, 9, 4]));
JS,
            ],
        ];
    }

    private function bubbleSort(): array
    {
        return [
            'title' => 'Tri a Bulles (Bubble Sort)',
            'description' => 'Tri naif par comparaisons adjacentes repetees. O(n^2). Pedagogique, inutilisable en pratique.',
            'tags' => ['algorithme', 'tri', 'debutant'],
            'snippets' => [
                'python' => <<<'PY'
def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        echange = False
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                echange = True
        if not echange:
            break
    return arr


if __name__ == "__main__":
    print(bubble_sort([5, 1, 4, 2, 8]))
PY,
                'java' => <<<'JAVA'
import java.util.Arrays;

public class BubbleSort {
    public static void sort(int[] a) {
        int n = a.length;
        for (int i = 0; i < n - 1; i++) {
            boolean swapped = false;
            for (int j = 0; j < n - i - 1; j++) {
                if (a[j] > a[j + 1]) {
                    int t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;
                    swapped = true;
                }
            }
            if (!swapped) break;
        }
    }

    public static void main(String[] args) {
        int[] a = {5, 1, 4, 2, 8};
        sort(a);
        System.out.println(Arrays.toString(a));
    }
}
JAVA,
                'c' => <<<'C'
#include <stdio.h>
#include <stdbool.h>

void bubble_sort(int *arr, int n) {
    for (int i = 0; i < n - 1; i++) {
        bool echange = false;
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                int t = arr[j]; arr[j] = arr[j + 1]; arr[j + 1] = t;
                echange = true;
            }
        }
        if (!echange) break;
    }
}

int main(void) {
    int arr[] = {5, 1, 4, 2, 8};
    int n = sizeof(arr) / sizeof(arr[0]);
    bubble_sort(arr, n);
    for (int i = 0; i < n; i++) printf("%d ", arr[i]);
    printf("\n");
    return 0;
}
C,
                'javascript' => <<<'JS'
function bubbleSort(arr) {
  const a = [...arr];
  for (let i = 0; i < a.length - 1; i++) {
    let swapped = false;
    for (let j = 0; j < a.length - i - 1; j++) {
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swapped = true;
      }
    }
    if (!swapped) break;
  }
  return a;
}

console.log(bubbleSort([5, 1, 4, 2, 8]));
JS,
            ],
        ];
    }

    private function insertionSort(): array
    {
        return [
            'title' => 'Tri par Insertion',
            'description' => 'Tri stable, in-place, efficace sur petits tableaux ou presque-tries. O(n^2) moyen, O(n) meilleur cas.',
            'tags' => ['algorithme', 'tri', 'debutant'],
            'snippets' => [
                'python' => <<<'PY'
def insertion_sort(arr):
    for i in range(1, len(arr)):
        cle = arr[i]
        j = i - 1
        while j >= 0 and arr[j] > cle:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = cle
    return arr


if __name__ == "__main__":
    print(insertion_sort([12, 11, 13, 5, 6]))
PY,
                'java' => <<<'JAVA'
import java.util.Arrays;

public class InsertionSort {
    public static void sort(int[] a) {
        for (int i = 1; i < a.length; i++) {
            int cle = a[i], j = i - 1;
            while (j >= 0 && a[j] > cle) {
                a[j + 1] = a[j];
                j--;
            }
            a[j + 1] = cle;
        }
    }

    public static void main(String[] args) {
        int[] a = {12, 11, 13, 5, 6};
        sort(a);
        System.out.println(Arrays.toString(a));
    }
}
JAVA,
                'c' => <<<'C'
#include <stdio.h>

void insertion_sort(int *arr, int n) {
    for (int i = 1; i < n; i++) {
        int cle = arr[i], j = i - 1;
        while (j >= 0 && arr[j] > cle) {
            arr[j + 1] = arr[j];
            j--;
        }
        arr[j + 1] = cle;
    }
}

int main(void) {
    int arr[] = {12, 11, 13, 5, 6};
    int n = sizeof(arr) / sizeof(arr[0]);
    insertion_sort(arr, n);
    for (int i = 0; i < n; i++) printf("%d ", arr[i]);
    printf("\n");
    return 0;
}
C,
                'javascript' => <<<'JS'
function insertionSort(arr) {
  const a = [...arr];
  for (let i = 1; i < a.length; i++) {
    const cle = a[i];
    let j = i - 1;
    while (j >= 0 && a[j] > cle) {
      a[j + 1] = a[j];
      j--;
    }
    a[j + 1] = cle;
  }
  return a;
}

console.log(insertionSort([12, 11, 13, 5, 6]));
JS,
            ],
        ];
    }

    private function selectionSort(): array
    {
        return [
            'title' => 'Tri par Selection',
            'description' => 'Cherche le minimum a chaque passe et le place en tete. O(n^2). In-place, non stable.',
            'tags' => ['algorithme', 'tri', 'debutant'],
            'snippets' => [
                'python' => <<<'PY'
def selection_sort(arr):
    n = len(arr)
    for i in range(n):
        min_idx = i
        for j in range(i + 1, n):
            if arr[j] < arr[min_idx]:
                min_idx = j
        arr[i], arr[min_idx] = arr[min_idx], arr[i]
    return arr


if __name__ == "__main__":
    print(selection_sort([64, 25, 12, 22, 11]))
PY,
                'java' => <<<'JAVA'
import java.util.Arrays;

public class SelectionSort {
    public static void sort(int[] a) {
        for (int i = 0; i < a.length - 1; i++) {
            int minIdx = i;
            for (int j = i + 1; j < a.length; j++) {
                if (a[j] < a[minIdx]) minIdx = j;
            }
            int t = a[i]; a[i] = a[minIdx]; a[minIdx] = t;
        }
    }

    public static void main(String[] args) {
        int[] a = {64, 25, 12, 22, 11};
        sort(a);
        System.out.println(Arrays.toString(a));
    }
}
JAVA,
                'c' => <<<'C'
#include <stdio.h>

void selection_sort(int *arr, int n) {
    for (int i = 0; i < n - 1; i++) {
        int min_idx = i;
        for (int j = i + 1; j < n; j++) {
            if (arr[j] < arr[min_idx]) min_idx = j;
        }
        int t = arr[i]; arr[i] = arr[min_idx]; arr[min_idx] = t;
    }
}

int main(void) {
    int arr[] = {64, 25, 12, 22, 11};
    int n = sizeof(arr) / sizeof(arr[0]);
    selection_sort(arr, n);
    for (int i = 0; i < n; i++) printf("%d ", arr[i]);
    printf("\n");
    return 0;
}
C,
                'javascript' => <<<'JS'
function selectionSort(arr) {
  const a = [...arr];
  for (let i = 0; i < a.length - 1; i++) {
    let minIdx = i;
    for (let j = i + 1; j < a.length; j++) {
      if (a[j] < a[minIdx]) minIdx = j;
    }
    [a[i], a[minIdx]] = [a[minIdx], a[i]];
  }
  return a;
}

console.log(selectionSort([64, 25, 12, 22, 11]));
JS,
            ],
        ];
    }

    private function heapSort(): array
    {
        return [
            'title' => 'Tri par Tas (Heap Sort)',
            'description' => 'Tri par tas binaire (max-heap). O(n log n) garanti, in-place, non stable.',
            'tags' => ['algorithme', 'tri', 'tas', 'structure-de-donnees'],
            'snippets' => [
                'python' => <<<'PY'
def heapify(arr, n, i):
    plus_grand = i
    gauche = 2 * i + 1
    droite = 2 * i + 2
    if gauche < n and arr[gauche] > arr[plus_grand]:
        plus_grand = gauche
    if droite < n and arr[droite] > arr[plus_grand]:
        plus_grand = droite
    if plus_grand != i:
        arr[i], arr[plus_grand] = arr[plus_grand], arr[i]
        heapify(arr, n, plus_grand)


def heap_sort(arr):
    n = len(arr)
    for i in range(n // 2 - 1, -1, -1):
        heapify(arr, n, i)
    for i in range(n - 1, 0, -1):
        arr[0], arr[i] = arr[i], arr[0]
        heapify(arr, i, 0)
    return arr


if __name__ == "__main__":
    print(heap_sort([12, 11, 13, 5, 6, 7]))
PY,
                'java' => <<<'JAVA'
import java.util.Arrays;

public class HeapSort {
    private static void heapify(int[] a, int n, int i) {
        int largest = i, l = 2 * i + 1, r = 2 * i + 2;
        if (l < n && a[l] > a[largest]) largest = l;
        if (r < n && a[r] > a[largest]) largest = r;
        if (largest != i) {
            int t = a[i]; a[i] = a[largest]; a[largest] = t;
            heapify(a, n, largest);
        }
    }

    public static void sort(int[] a) {
        int n = a.length;
        for (int i = n / 2 - 1; i >= 0; i--) heapify(a, n, i);
        for (int i = n - 1; i > 0; i--) {
            int t = a[0]; a[0] = a[i]; a[i] = t;
            heapify(a, i, 0);
        }
    }

    public static void main(String[] args) {
        int[] a = {12, 11, 13, 5, 6, 7};
        sort(a);
        System.out.println(Arrays.toString(a));
    }
}
JAVA,
                'c' => <<<'C'
#include <stdio.h>

static void heapify(int *arr, int n, int i) {
    int largest = i, l = 2 * i + 1, r = 2 * i + 2;
    if (l < n && arr[l] > arr[largest]) largest = l;
    if (r < n && arr[r] > arr[largest]) largest = r;
    if (largest != i) {
        int t = arr[i]; arr[i] = arr[largest]; arr[largest] = t;
        heapify(arr, n, largest);
    }
}

void heap_sort(int *arr, int n) {
    for (int i = n / 2 - 1; i >= 0; i--) heapify(arr, n, i);
    for (int i = n - 1; i > 0; i--) {
        int t = arr[0]; arr[0] = arr[i]; arr[i] = t;
        heapify(arr, i, 0);
    }
}

int main(void) {
    int arr[] = {12, 11, 13, 5, 6, 7};
    int n = sizeof(arr) / sizeof(arr[0]);
    heap_sort(arr, n);
    for (int i = 0; i < n; i++) printf("%d ", arr[i]);
    printf("\n");
    return 0;
}
C,
                'javascript' => <<<'JS'
function heapify(a, n, i) {
  let largest = i;
  const l = 2 * i + 1, r = 2 * i + 2;
  if (l < n && a[l] > a[largest]) largest = l;
  if (r < n && a[r] > a[largest]) largest = r;
  if (largest !== i) {
    [a[i], a[largest]] = [a[largest], a[i]];
    heapify(a, n, largest);
  }
}

function heapSort(arr) {
  const a = [...arr];
  const n = a.length;
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) heapify(a, n, i);
  for (let i = n - 1; i > 0; i--) {
    [a[0], a[i]] = [a[i], a[0]];
    heapify(a, i, 0);
  }
  return a;
}

console.log(heapSort([12, 11, 13, 5, 6, 7]));
JS,
            ],
        ];
    }

    private function singlyLinkedList(): array
    {
        return [
            'title' => 'Liste Simplement Chainee',
            'description' => 'Implementation d\'une liste chainee : insertion tete/queue, suppression, parcours, inversion iterative.',
            'tags' => ['structure-de-donnees', 'liste-chainee', 'pointeurs'],
            'snippets' => [
                'python' => <<<'PY'
class Noeud:
    def __init__(self, valeur):
        self.valeur = valeur
        self.suivant = None


class ListeChainee:
    def __init__(self):
        self.tete = None

    def inserer_tete(self, valeur):
        n = Noeud(valeur)
        n.suivant = self.tete
        self.tete = n

    def inserer_queue(self, valeur):
        n = Noeud(valeur)
        if self.tete is None:
            self.tete = n
            return
        courant = self.tete
        while courant.suivant:
            courant = courant.suivant
        courant.suivant = n

    def supprimer(self, valeur):
        courant = self.tete
        precedent = None
        while courant:
            if courant.valeur == valeur:
                if precedent:
                    precedent.suivant = courant.suivant
                else:
                    self.tete = courant.suivant
                return True
            precedent, courant = courant, courant.suivant
        return False

    def inverser(self):
        precedent = None
        courant = self.tete
        while courant:
            suivant = courant.suivant
            courant.suivant = precedent
            precedent, courant = courant, suivant
        self.tete = precedent

    def __str__(self):
        vals = []
        c = self.tete
        while c:
            vals.append(str(c.valeur))
            c = c.suivant
        return " -> ".join(vals)


if __name__ == "__main__":
    l = ListeChainee()
    for v in [1, 2, 3, 4]:
        l.inserer_queue(v)
    l.inverser()
    print(l)
PY,
                'java' => <<<'JAVA'
public class LinkedList {
    static class Node {
        int val;
        Node next;
        Node(int v) { val = v; }
    }

    private Node head;

    public void insertHead(int v) {
        Node n = new Node(v);
        n.next = head;
        head = n;
    }

    public void insertTail(int v) {
        Node n = new Node(v);
        if (head == null) { head = n; return; }
        Node c = head;
        while (c.next != null) c = c.next;
        c.next = n;
    }

    public boolean remove(int v) {
        Node c = head, prev = null;
        while (c != null) {
            if (c.val == v) {
                if (prev == null) head = c.next;
                else prev.next = c.next;
                return true;
            }
            prev = c; c = c.next;
        }
        return false;
    }

    public void reverse() {
        Node prev = null, c = head;
        while (c != null) {
            Node next = c.next;
            c.next = prev;
            prev = c; c = next;
        }
        head = prev;
    }

    public void print() {
        StringBuilder sb = new StringBuilder();
        for (Node c = head; c != null; c = c.next) {
            sb.append(c.val);
            if (c.next != null) sb.append(" -> ");
        }
        System.out.println(sb);
    }

    public static void main(String[] args) {
        LinkedList l = new LinkedList();
        for (int v : new int[]{1, 2, 3, 4}) l.insertTail(v);
        l.reverse();
        l.print();
    }
}
JAVA,
                'c' => <<<'C'
#include <stdio.h>
#include <stdlib.h>

typedef struct Noeud {
    int valeur;
    struct Noeud *suivant;
} Noeud;

static Noeud *tete = NULL;

void inserer_queue(int v) {
    Noeud *n = malloc(sizeof(Noeud));
    n->valeur = v;
    n->suivant = NULL;
    if (!tete) { tete = n; return; }
    Noeud *c = tete;
    while (c->suivant) c = c->suivant;
    c->suivant = n;
}

void inverser(void) {
    Noeud *prev = NULL, *c = tete;
    while (c) {
        Noeud *next = c->suivant;
        c->suivant = prev;
        prev = c; c = next;
    }
    tete = prev;
}

void afficher(void) {
    for (Noeud *c = tete; c; c = c->suivant) {
        printf("%d%s", c->valeur, c->suivant ? " -> " : "\n");
    }
}

void liberer(void) {
    Noeud *c = tete;
    while (c) { Noeud *n = c->suivant; free(c); c = n; }
    tete = NULL;
}

int main(void) {
    for (int v = 1; v <= 4; v++) inserer_queue(v);
    inverser();
    afficher();
    liberer();
    return 0;
}
C,
                'javascript' => <<<'JS'
class Noeud {
  constructor(valeur) {
    this.valeur = valeur;
    this.suivant = null;
  }
}

class ListeChainee {
  constructor() { this.tete = null; }

  insererQueue(v) {
    const n = new Noeud(v);
    if (!this.tete) { this.tete = n; return; }
    let c = this.tete;
    while (c.suivant) c = c.suivant;
    c.suivant = n;
  }

  inverser() {
    let prev = null, c = this.tete;
    while (c) {
      const next = c.suivant;
      c.suivant = prev;
      prev = c; c = next;
    }
    this.tete = prev;
  }

  toString() {
    const vals = [];
    let c = this.tete;
    while (c) { vals.push(c.valeur); c = c.suivant; }
    return vals.join(' -> ');
  }
}

const l = new ListeChainee();
[1, 2, 3, 4].forEach(v => l.insererQueue(v));
l.inverser();
console.log(l.toString());
JS,
            ],
        ];
    }

    private function doublyLinkedList(): array
    {
        return [
            'title' => 'Liste Doublement Chainee',
            'description' => 'Liste avec pointeurs avant ET arriere. Parcours bidirectionnel, insertion/suppression O(1) si noeud connu.',
            'tags' => ['structure-de-donnees', 'liste-chainee', 'pointeurs'],
            'snippets' => [
                'python' => <<<'PY'
class Noeud:
    def __init__(self, valeur):
        self.valeur = valeur
        self.suivant = None
        self.precedent = None


class ListeDoublementChainee:
    def __init__(self):
        self.tete = None
        self.queue = None

    def inserer_queue(self, v):
        n = Noeud(v)
        if self.queue is None:
            self.tete = self.queue = n
            return
        n.precedent = self.queue
        self.queue.suivant = n
        self.queue = n

    def supprimer(self, v):
        c = self.tete
        while c:
            if c.valeur == v:
                if c.precedent: c.precedent.suivant = c.suivant
                else: self.tete = c.suivant
                if c.suivant: c.suivant.precedent = c.precedent
                else: self.queue = c.precedent
                return True
            c = c.suivant
        return False

    def parcourir_avant(self):
        r, c = [], self.tete
        while c: r.append(c.valeur); c = c.suivant
        return r

    def parcourir_arriere(self):
        r, c = [], self.queue
        while c: r.append(c.valeur); c = c.precedent
        return r


if __name__ == "__main__":
    l = ListeDoublementChainee()
    for v in [10, 20, 30, 40]:
        l.inserer_queue(v)
    print("avant :", l.parcourir_avant())
    print("arriere:", l.parcourir_arriere())
PY,
                'java' => <<<'JAVA'
import java.util.ArrayList;
import java.util.List;

public class DoublyLinkedList {
    static class Node {
        int val;
        Node prev, next;
        Node(int v) { val = v; }
    }

    private Node head, tail;

    public void insertTail(int v) {
        Node n = new Node(v);
        if (tail == null) { head = tail = n; return; }
        n.prev = tail;
        tail.next = n;
        tail = n;
    }

    public boolean remove(int v) {
        for (Node c = head; c != null; c = c.next) {
            if (c.val == v) {
                if (c.prev != null) c.prev.next = c.next; else head = c.next;
                if (c.next != null) c.next.prev = c.prev; else tail = c.prev;
                return true;
            }
        }
        return false;
    }

    public List<Integer> forward() {
        List<Integer> r = new ArrayList<>();
        for (Node c = head; c != null; c = c.next) r.add(c.val);
        return r;
    }

    public List<Integer> backward() {
        List<Integer> r = new ArrayList<>();
        for (Node c = tail; c != null; c = c.prev) r.add(c.val);
        return r;
    }

    public static void main(String[] args) {
        DoublyLinkedList l = new DoublyLinkedList();
        for (int v : new int[]{10, 20, 30, 40}) l.insertTail(v);
        System.out.println("avant : " + l.forward());
        System.out.println("arriere: " + l.backward());
    }
}
JAVA,
                'c' => <<<'C'
#include <stdio.h>
#include <stdlib.h>

typedef struct Noeud {
    int valeur;
    struct Noeud *precedent;
    struct Noeud *suivant;
} Noeud;

static Noeud *tete = NULL, *queue = NULL;

void inserer_queue(int v) {
    Noeud *n = malloc(sizeof(Noeud));
    n->valeur = v;
    n->suivant = NULL;
    n->precedent = queue;
    if (queue) queue->suivant = n;
    else tete = n;
    queue = n;
}

void afficher_avant(void) {
    for (Noeud *c = tete; c; c = c->suivant)
        printf("%d%s", c->valeur, c->suivant ? " <-> " : "\n");
}

void afficher_arriere(void) {
    for (Noeud *c = queue; c; c = c->precedent)
        printf("%d%s", c->valeur, c->precedent ? " <-> " : "\n");
}

void liberer(void) {
    Noeud *c = tete;
    while (c) { Noeud *n = c->suivant; free(c); c = n; }
    tete = queue = NULL;
}

int main(void) {
    for (int v = 10; v <= 40; v += 10) inserer_queue(v);
    afficher_avant();
    afficher_arriere();
    liberer();
    return 0;
}
C,
                'javascript' => <<<'JS'
class Noeud {
  constructor(v) {
    this.valeur = v;
    this.precedent = null;
    this.suivant = null;
  }
}

class DLL {
  constructor() { this.tete = null; this.queue = null; }

  insererQueue(v) {
    const n = new Noeud(v);
    if (!this.queue) { this.tete = this.queue = n; return; }
    n.precedent = this.queue;
    this.queue.suivant = n;
    this.queue = n;
  }

  parcourirAvant() {
    const r = [];
    for (let c = this.tete; c; c = c.suivant) r.push(c.valeur);
    return r;
  }

  parcourirArriere() {
    const r = [];
    for (let c = this.queue; c; c = c.precedent) r.push(c.valeur);
    return r;
  }
}

const l = new DLL();
[10, 20, 30, 40].forEach(v => l.insererQueue(v));
console.log('avant :', l.parcourirAvant());
console.log('arriere:', l.parcourirArriere());
JS,
            ],
        ];
    }

    private function cycleDetection(): array
    {
        return [
            'title' => 'Detection de Cycle (Floyd)',
            'description' => 'Algorithme du lievre et de la tortue pour detecter un cycle dans une liste chainee. O(n) temps, O(1) espace.',
            'tags' => ['algorithme', 'liste-chainee', 'deux-pointeurs'],
            'snippets' => [
                'python' => <<<'PY'
class Noeud:
    def __init__(self, v):
        self.valeur = v
        self.suivant = None


def contient_cycle(tete):
    lent = rapide = tete
    while rapide and rapide.suivant:
        lent = lent.suivant
        rapide = rapide.suivant.suivant
        if lent is rapide:
            return True
    return False


if __name__ == "__main__":
    a, b, c = Noeud(1), Noeud(2), Noeud(3)
    a.suivant, b.suivant, c.suivant = b, c, a  # cycle
    print(contient_cycle(a))  # True
PY,
                'java' => <<<'JAVA'
public class CycleDetection {
    static class Node {
        int val;
        Node next;
        Node(int v) { val = v; }
    }

    public static boolean hasCycle(Node head) {
        Node slow = head, fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) return true;
        }
        return false;
    }

    public static void main(String[] args) {
        Node a = new Node(1), b = new Node(2), c = new Node(3);
        a.next = b; b.next = c; c.next = a;
        System.out.println(hasCycle(a));
    }
}
JAVA,
                'c' => <<<'C'
#include <stdio.h>
#include <stdbool.h>
#include <stdlib.h>

typedef struct Noeud {
    int valeur;
    struct Noeud *suivant;
} Noeud;

bool contient_cycle(Noeud *tete) {
    Noeud *lent = tete, *rapide = tete;
    while (rapide && rapide->suivant) {
        lent = lent->suivant;
        rapide = rapide->suivant->suivant;
        if (lent == rapide) return true;
    }
    return false;
}

int main(void) {
    Noeud *a = malloc(sizeof(Noeud)), *b = malloc(sizeof(Noeud)), *c = malloc(sizeof(Noeud));
    a->valeur = 1; b->valeur = 2; c->valeur = 3;
    a->suivant = b; b->suivant = c; c->suivant = a;
    printf("%s\n", contient_cycle(a) ? "cycle" : "pas de cycle");
    /* Fuite volontaire — exemple pedagogique avec cycle. */
    return 0;
}
C,
                'javascript' => <<<'JS'
class Noeud {
  constructor(v) { this.valeur = v; this.suivant = null; }
}

function contientCycle(tete) {
  let lent = tete, rapide = tete;
  while (rapide && rapide.suivant) {
    lent = lent.suivant;
    rapide = rapide.suivant.suivant;
    if (lent === rapide) return true;
  }
  return false;
}

const a = new Noeud(1), b = new Noeud(2), c = new Noeud(3);
a.suivant = b; b.suivant = c; c.suivant = a;
console.log(contientCycle(a));
JS,
            ],
        ];
    }

    private function tcpEchoClientServer(): array
    {
        return [
            'title' => 'TCP Client/Serveur Echo',
            'description' => 'Serveur TCP basique qui accepte UNE connexion, renvoie ce que le client envoie, et ferme. Point de depart reseau.',
            'tags' => ['reseau', 'tcp', 'socket'],
            'snippets' => [
                'python' => <<<'PY'
# --- Serveur TCP echo (mono-client) ---
import socket

HOTE, PORT = "127.0.0.1", 9000
with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as srv:
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind((HOTE, PORT))
    srv.listen(1)
    print(f"En attente sur {HOTE}:{PORT}...")
    conn, addr = srv.accept()
    with conn:
        print(f"Connecte: {addr}")
        while (donnees := conn.recv(1024)):
            conn.sendall(donnees)


# --- Client TCP ---
# import socket
# with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as c:
#     c.connect(("127.0.0.1", 9000))
#     c.sendall(b"Hello")
#     print(c.recv(1024))
PY,
                'java' => <<<'JAVA'
import java.io.*;
import java.net.*;

public class TcpEcho {
    public static void main(String[] args) throws IOException {
        try (ServerSocket srv = new ServerSocket(9000)) {
            System.out.println("En attente sur 9000...");
            try (Socket client = srv.accept();
                 BufferedReader in = new BufferedReader(new InputStreamReader(client.getInputStream()));
                 PrintWriter out = new PrintWriter(client.getOutputStream(), true)) {
                String ligne;
                while ((ligne = in.readLine()) != null) {
                    out.println(ligne);
                }
            }
        }
    }
}
JAVA,
                'c' => <<<'C'
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <sys/socket.h>

int main(void) {
    int srv = socket(AF_INET, SOCK_STREAM, 0);
    int opt = 1;
    setsockopt(srv, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    struct sockaddr_in addr = {0};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    addr.sin_port = htons(9000);

    if (bind(srv, (struct sockaddr *)&addr, sizeof(addr)) < 0) { perror("bind"); return 1; }
    if (listen(srv, 1) < 0) { perror("listen"); return 1; }
    printf("En attente sur 9000...\n");

    int client = accept(srv, NULL, NULL);
    char buf[1024];
    ssize_t n;
    while ((n = read(client, buf, sizeof(buf))) > 0) {
        write(client, buf, n);
    }
    close(client);
    close(srv);
    return 0;
}
C,
                'javascript' => <<<'JS'
// --- Serveur TCP echo (Node.js) ---
const net = require('net');

const server = net.createServer(socket => {
  console.log('Connecte:', socket.remoteAddress, socket.remotePort);
  socket.on('data', data => socket.write(data));
  socket.on('end', () => console.log('Client deconnecte'));
});

server.listen(9000, '127.0.0.1', () => {
  console.log('En attente sur 127.0.0.1:9000...');
});


// --- Client TCP ---
// const c = net.connect(9000, '127.0.0.1', () => c.write('Hello'));
// c.on('data', d => { console.log(d.toString()); c.end(); });
JS,
            ],
        ];
    }

    private function tcpMultiClientServer(): array
    {
        return [
            'title' => 'TCP Serveur Multi-Clients',
            'description' => 'Serveur TCP gerant plusieurs clients concurrents (threads ou async). Une connexion = un handler independant.',
            'tags' => ['reseau', 'tcp', 'socket', 'concurrence'],
            'snippets' => [
                'python' => <<<'PY'
# Serveur multi-clients avec threads (un thread par client)
import socket
import threading

def gerer_client(conn, addr):
    print(f"[+] {addr} connecte")
    try:
        while (donnees := conn.recv(1024)):
            conn.sendall(b"ECHO: " + donnees)
    finally:
        conn.close()
        print(f"[-] {addr} deconnecte")


HOTE, PORT = "0.0.0.0", 9000
with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as srv:
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind((HOTE, PORT))
    srv.listen(16)
    print(f"En attente sur {HOTE}:{PORT}...")
    while True:
        conn, addr = srv.accept()
        t = threading.Thread(target=gerer_client, args=(conn, addr), daemon=True)
        t.start()
PY,
                'java' => <<<'JAVA'
import java.io.*;
import java.net.*;
import java.util.concurrent.*;

public class TcpMultiServer {
    public static void main(String[] args) throws IOException {
        ExecutorService pool = Executors.newCachedThreadPool();
        try (ServerSocket srv = new ServerSocket(9000)) {
            System.out.println("En attente sur 9000...");
            while (true) {
                Socket client = srv.accept();
                pool.submit(() -> handle(client));
            }
        }
    }

    private static void handle(Socket client) {
        System.out.println("[+] " + client.getRemoteSocketAddress());
        try (BufferedReader in = new BufferedReader(new InputStreamReader(client.getInputStream()));
             PrintWriter out = new PrintWriter(client.getOutputStream(), true)) {
            String ligne;
            while ((ligne = in.readLine()) != null) {
                out.println("ECHO: " + ligne);
            }
        } catch (IOException e) {
            System.err.println(e.getMessage());
        }
    }
}
JAVA,
                'c' => <<<'C'
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>
#include <pthread.h>
#include <arpa/inet.h>
#include <sys/socket.h>

static void *gerer_client(void *arg) {
    int fd = *(int *)arg;
    free(arg);
    char buf[1024];
    ssize_t n;
    while ((n = read(fd, buf, sizeof(buf))) > 0) {
        write(fd, "ECHO: ", 6);
        write(fd, buf, n);
    }
    close(fd);
    return NULL;
}

int main(void) {
    int srv = socket(AF_INET, SOCK_STREAM, 0);
    int opt = 1;
    setsockopt(srv, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    struct sockaddr_in addr = {0};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = htonl(INADDR_ANY);
    addr.sin_port = htons(9000);

    bind(srv, (struct sockaddr *)&addr, sizeof(addr));
    listen(srv, 16);
    printf("En attente sur 9000...\n");

    while (1) {
        int *client = malloc(sizeof(int));
        *client = accept(srv, NULL, NULL);
        pthread_t t;
        pthread_create(&t, NULL, gerer_client, client);
        pthread_detach(t);
    }
    /* Jamais atteint dans ce demo */
    close(srv);
    return 0;
}
C,
                'javascript' => <<<'JS'
// Node.js est non-bloquant par design : un serveur net gere deja N clients
// en parallele sans thread. Demo avec event loop unique.
const net = require('net');

const server = net.createServer(socket => {
  const who = `${socket.remoteAddress}:${socket.remotePort}`;
  console.log(`[+] ${who}`);
  socket.on('data', d => socket.write(Buffer.concat([Buffer.from('ECHO: '), d])));
  socket.on('end', () => console.log(`[-] ${who}`));
  socket.on('error', err => console.error(who, err.message));
});

server.listen(9000, '0.0.0.0', () => console.log('En attente sur 0.0.0.0:9000...'));
JS,
            ],
        ];
    }

    private function udpEchoClientServer(): array
    {
        return [
            'title' => 'UDP Client/Serveur',
            'description' => 'Echo datagramme UDP (sans connexion). Compare a TCP : pas d\'accept, pas de flux, juste des paquets.',
            'tags' => ['reseau', 'udp', 'socket'],
            'snippets' => [
                'python' => <<<'PY'
# Serveur UDP
import socket

HOTE, PORT = "0.0.0.0", 9001
srv = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
srv.bind((HOTE, PORT))
print(f"En attente UDP sur {HOTE}:{PORT}...")
while True:
    data, addr = srv.recvfrom(4096)
    print(f"{addr}: {data!r}")
    srv.sendto(b"ECHO " + data, addr)


# Client UDP
# c = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
# c.sendto(b"hello", ("127.0.0.1", 9001))
# print(c.recvfrom(4096))
PY,
                'java' => <<<'JAVA'
import java.net.*;

public class UdpEcho {
    public static void main(String[] args) throws Exception {
        try (DatagramSocket srv = new DatagramSocket(9001)) {
            System.out.println("En attente UDP sur 9001...");
            byte[] buf = new byte[4096];
            while (true) {
                DatagramPacket in = new DatagramPacket(buf, buf.length);
                srv.receive(in);
                byte[] echo = new byte[in.getLength() + 5];
                System.arraycopy("ECHO ".getBytes(), 0, echo, 0, 5);
                System.arraycopy(in.getData(), 0, echo, 5, in.getLength());
                srv.send(new DatagramPacket(echo, echo.length, in.getAddress(), in.getPort()));
            }
        }
    }
}
JAVA,
                'c' => <<<'C'
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <sys/socket.h>

int main(void) {
    int srv = socket(AF_INET, SOCK_DGRAM, 0);
    struct sockaddr_in addr = {0};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = htonl(INADDR_ANY);
    addr.sin_port = htons(9001);
    bind(srv, (struct sockaddr *)&addr, sizeof(addr));
    printf("En attente UDP sur 9001...\n");

    char buf[4096];
    struct sockaddr_in client;
    socklen_t clen = sizeof(client);
    while (1) {
        ssize_t n = recvfrom(srv, buf, sizeof(buf), 0, (struct sockaddr *)&client, &clen);
        if (n < 0) break;
        sendto(srv, buf, n, 0, (struct sockaddr *)&client, clen);
    }
    close(srv);
    return 0;
}
C,
                'javascript' => <<<'JS'
// Serveur UDP (Node.js)
const dgram = require('dgram');
const srv = dgram.createSocket('udp4');

srv.on('message', (msg, rinfo) => {
  console.log(`${rinfo.address}:${rinfo.port} >`, msg.toString());
  srv.send(Buffer.concat([Buffer.from('ECHO '), msg]), rinfo.port, rinfo.address);
});

srv.on('listening', () => {
  const a = srv.address();
  console.log(`En attente UDP sur ${a.address}:${a.port}`);
});

srv.bind(9001);
JS,
            ],
        ];
    }

    private function binarySearch(): array
    {
        return [
            'title' => 'Recherche Dichotomique',
            'description' => 'Binary search sur tableau trie. O(log n). Versions iterative et recursive.',
            'tags' => ['algorithme', 'recherche', 'diviser-pour-regner'],
            'snippets' => [
                'python' => <<<'PY'
def binary_search(arr, cible):
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        milieu = (lo + hi) // 2
        if arr[milieu] == cible:
            return milieu
        if arr[milieu] < cible:
            lo = milieu + 1
        else:
            hi = milieu - 1
    return -1


def binary_search_rec(arr, cible, lo=0, hi=None):
    if hi is None:
        hi = len(arr) - 1
    if lo > hi:
        return -1
    milieu = (lo + hi) // 2
    if arr[milieu] == cible:
        return milieu
    if arr[milieu] < cible:
        return binary_search_rec(arr, cible, milieu + 1, hi)
    return binary_search_rec(arr, cible, lo, milieu - 1)


if __name__ == "__main__":
    print(binary_search([1, 3, 5, 7, 9, 11], 7))
PY,
                'java' => <<<'JAVA'
public class BinarySearch {
    public static int search(int[] a, int cible) {
        int lo = 0, hi = a.length - 1;
        while (lo <= hi) {
            int mid = (lo + hi) >>> 1;
            if (a[mid] == cible) return mid;
            if (a[mid] < cible) lo = mid + 1;
            else hi = mid - 1;
        }
        return -1;
    }

    public static void main(String[] args) {
        int[] a = {1, 3, 5, 7, 9, 11};
        System.out.println(search(a, 7));
    }
}
JAVA,
                'c' => <<<'C'
#include <stdio.h>

int binary_search(const int *arr, int n, int cible) {
    int lo = 0, hi = n - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (arr[mid] == cible) return mid;
        if (arr[mid] < cible) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}

int main(void) {
    int arr[] = {1, 3, 5, 7, 9, 11};
    int n = sizeof(arr) / sizeof(arr[0]);
    printf("%d\n", binary_search(arr, n, 7));
    return 0;
}
C,
                'javascript' => <<<'JS'
function binarySearch(arr, cible) {
  let lo = 0, hi = arr.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] === cible) return mid;
    if (arr[mid] < cible) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}

console.log(binarySearch([1, 3, 5, 7, 9, 11], 7));
JS,
            ],
        ];
    }

    private function binaryTreeTraversal(): array
    {
        return [
            'title' => 'Parcours d\'Arbre Binaire',
            'description' => 'Pre-ordre, in-ordre, post-ordre (DFS) et largeur (BFS). Fondamentaux des structures arborescentes.',
            'tags' => ['structure-de-donnees', 'arbre', 'recursion', 'bfs', 'dfs'],
            'snippets' => [
                'python' => <<<'PY'
from collections import deque


class Noeud:
    def __init__(self, v):
        self.valeur = v
        self.gauche = None
        self.droite = None


def pre_ordre(n):
    if n is None: return
    print(n.valeur, end=' ')
    pre_ordre(n.gauche)
    pre_ordre(n.droite)


def in_ordre(n):
    if n is None: return
    in_ordre(n.gauche)
    print(n.valeur, end=' ')
    in_ordre(n.droite)


def post_ordre(n):
    if n is None: return
    post_ordre(n.gauche)
    post_ordre(n.droite)
    print(n.valeur, end=' ')


def bfs(racine):
    if racine is None: return
    q = deque([racine])
    while q:
        n = q.popleft()
        print(n.valeur, end=' ')
        if n.gauche: q.append(n.gauche)
        if n.droite: q.append(n.droite)


if __name__ == "__main__":
    r = Noeud(1)
    r.gauche = Noeud(2); r.droite = Noeud(3)
    r.gauche.gauche = Noeud(4); r.gauche.droite = Noeud(5)
    print("pre :", end=' '); pre_ordre(r); print()
    print("in  :", end=' '); in_ordre(r); print()
    print("post:", end=' '); post_ordre(r); print()
    print("bfs :", end=' '); bfs(r); print()
PY,
                'java' => <<<'JAVA'
import java.util.*;

public class TreeTraversal {
    static class Node {
        int val;
        Node left, right;
        Node(int v) { val = v; }
    }

    static void preOrder(Node n) {
        if (n == null) return;
        System.out.print(n.val + " ");
        preOrder(n.left);
        preOrder(n.right);
    }

    static void inOrder(Node n) {
        if (n == null) return;
        inOrder(n.left);
        System.out.print(n.val + " ");
        inOrder(n.right);
    }

    static void postOrder(Node n) {
        if (n == null) return;
        postOrder(n.left);
        postOrder(n.right);
        System.out.print(n.val + " ");
    }

    static void bfs(Node r) {
        if (r == null) return;
        Deque<Node> q = new ArrayDeque<>();
        q.add(r);
        while (!q.isEmpty()) {
            Node n = q.poll();
            System.out.print(n.val + " ");
            if (n.left != null) q.add(n.left);
            if (n.right != null) q.add(n.right);
        }
    }

    public static void main(String[] args) {
        Node r = new Node(1);
        r.left = new Node(2); r.right = new Node(3);
        r.left.left = new Node(4); r.left.right = new Node(5);
        preOrder(r); System.out.println();
        inOrder(r); System.out.println();
        postOrder(r); System.out.println();
        bfs(r); System.out.println();
    }
}
JAVA,
                'c' => <<<'C'
#include <stdio.h>
#include <stdlib.h>

typedef struct Noeud {
    int valeur;
    struct Noeud *gauche;
    struct Noeud *droite;
} Noeud;

static Noeud *creer(int v) {
    Noeud *n = malloc(sizeof(Noeud));
    n->valeur = v; n->gauche = n->droite = NULL;
    return n;
}

void pre_ordre(Noeud *n) {
    if (!n) return;
    printf("%d ", n->valeur);
    pre_ordre(n->gauche);
    pre_ordre(n->droite);
}

void in_ordre(Noeud *n) {
    if (!n) return;
    in_ordre(n->gauche);
    printf("%d ", n->valeur);
    in_ordre(n->droite);
}

void post_ordre(Noeud *n) {
    if (!n) return;
    post_ordre(n->gauche);
    post_ordre(n->droite);
    printf("%d ", n->valeur);
}

void liberer(Noeud *n) {
    if (!n) return;
    liberer(n->gauche);
    liberer(n->droite);
    free(n);
}

int main(void) {
    Noeud *r = creer(1);
    r->gauche = creer(2); r->droite = creer(3);
    r->gauche->gauche = creer(4); r->gauche->droite = creer(5);
    pre_ordre(r); printf("\n");
    in_ordre(r); printf("\n");
    post_ordre(r); printf("\n");
    liberer(r);
    return 0;
}
C,
                'javascript' => <<<'JS'
class Noeud {
  constructor(v) { this.valeur = v; this.gauche = null; this.droite = null; }
}

const preOrdre = (n, acc = []) => {
  if (!n) return acc;
  acc.push(n.valeur);
  preOrdre(n.gauche, acc);
  preOrdre(n.droite, acc);
  return acc;
};

const inOrdre = (n, acc = []) => {
  if (!n) return acc;
  inOrdre(n.gauche, acc);
  acc.push(n.valeur);
  inOrdre(n.droite, acc);
  return acc;
};

const bfs = r => {
  if (!r) return [];
  const q = [r], out = [];
  while (q.length) {
    const n = q.shift();
    out.push(n.valeur);
    if (n.gauche) q.push(n.gauche);
    if (n.droite) q.push(n.droite);
  }
  return out;
};

const r = new Noeud(1);
r.gauche = new Noeud(2); r.droite = new Noeud(3);
r.gauche.gauche = new Noeud(4); r.gauche.droite = new Noeud(5);
console.log('pre :', preOrdre(r));
console.log('in  :', inOrdre(r));
console.log('bfs :', bfs(r));
JS,
            ],
        ];
    }

    private function bstOperations(): array
    {
        return [
            'title' => 'Arbre Binaire de Recherche (BST)',
            'description' => 'BST : insertion, recherche, suppression (cas feuille / 1 enfant / 2 enfants avec successeur).',
            'tags' => ['structure-de-donnees', 'arbre', 'bst', 'recherche'],
            'snippets' => [
                'python' => <<<'PY'
class Noeud:
    def __init__(self, v):
        self.valeur = v
        self.gauche = None
        self.droite = None


def inserer(r, v):
    if r is None: return Noeud(v)
    if v < r.valeur: r.gauche = inserer(r.gauche, v)
    elif v > r.valeur: r.droite = inserer(r.droite, v)
    return r


def rechercher(r, v):
    if r is None or r.valeur == v: return r
    return rechercher(r.gauche, v) if v < r.valeur else rechercher(r.droite, v)


def _min_node(r):
    while r.gauche: r = r.gauche
    return r


def supprimer(r, v):
    if r is None: return None
    if v < r.valeur: r.gauche = supprimer(r.gauche, v)
    elif v > r.valeur: r.droite = supprimer(r.droite, v)
    else:
        if r.gauche is None: return r.droite
        if r.droite is None: return r.gauche
        succ = _min_node(r.droite)
        r.valeur = succ.valeur
        r.droite = supprimer(r.droite, succ.valeur)
    return r
PY,
                'java' => <<<'JAVA'
public class BST {
    static class Node {
        int val;
        Node left, right;
        Node(int v) { val = v; }
    }

    public static Node insert(Node r, int v) {
        if (r == null) return new Node(v);
        if (v < r.val) r.left = insert(r.left, v);
        else if (v > r.val) r.right = insert(r.right, v);
        return r;
    }

    public static Node search(Node r, int v) {
        if (r == null || r.val == v) return r;
        return v < r.val ? search(r.left, v) : search(r.right, v);
    }

    private static Node minNode(Node r) {
        while (r.left != null) r = r.left;
        return r;
    }

    public static Node remove(Node r, int v) {
        if (r == null) return null;
        if (v < r.val) r.left = remove(r.left, v);
        else if (v > r.val) r.right = remove(r.right, v);
        else {
            if (r.left == null) return r.right;
            if (r.right == null) return r.left;
            Node s = minNode(r.right);
            r.val = s.val;
            r.right = remove(r.right, s.val);
        }
        return r;
    }
}
JAVA,
                'c' => <<<'C'
#include <stdio.h>
#include <stdlib.h>

typedef struct Noeud {
    int valeur;
    struct Noeud *gauche;
    struct Noeud *droite;
} Noeud;

static Noeud *creer(int v) {
    Noeud *n = malloc(sizeof(Noeud));
    n->valeur = v; n->gauche = n->droite = NULL;
    return n;
}

Noeud *inserer(Noeud *r, int v) {
    if (!r) return creer(v);
    if (v < r->valeur) r->gauche = inserer(r->gauche, v);
    else if (v > r->valeur) r->droite = inserer(r->droite, v);
    return r;
}

Noeud *rechercher(Noeud *r, int v) {
    if (!r || r->valeur == v) return r;
    return v < r->valeur ? rechercher(r->gauche, v) : rechercher(r->droite, v);
}

static Noeud *min_n(Noeud *r) {
    while (r->gauche) r = r->gauche;
    return r;
}

Noeud *supprimer(Noeud *r, int v) {
    if (!r) return NULL;
    if (v < r->valeur) r->gauche = supprimer(r->gauche, v);
    else if (v > r->valeur) r->droite = supprimer(r->droite, v);
    else {
        if (!r->gauche) { Noeud *t = r->droite; free(r); return t; }
        if (!r->droite) { Noeud *t = r->gauche; free(r); return t; }
        Noeud *s = min_n(r->droite);
        r->valeur = s->valeur;
        r->droite = supprimer(r->droite, s->valeur);
    }
    return r;
}
C,
                'javascript' => <<<'JS'
class Noeud {
  constructor(v) { this.valeur = v; this.gauche = null; this.droite = null; }
}

const inserer = (r, v) => {
  if (!r) return new Noeud(v);
  if (v < r.valeur) r.gauche = inserer(r.gauche, v);
  else if (v > r.valeur) r.droite = inserer(r.droite, v);
  return r;
};

const rechercher = (r, v) =>
  !r || r.valeur === v ? r : rechercher(v < r.valeur ? r.gauche : r.droite, v);

const minNode = r => { while (r.gauche) r = r.gauche; return r; };

const supprimer = (r, v) => {
  if (!r) return null;
  if (v < r.valeur) r.gauche = supprimer(r.gauche, v);
  else if (v > r.valeur) r.droite = supprimer(r.droite, v);
  else {
    if (!r.gauche) return r.droite;
    if (!r.droite) return r.gauche;
    const s = minNode(r.droite);
    r.valeur = s.valeur;
    r.droite = supprimer(r.droite, s.valeur);
  }
  return r;
};
JS,
            ],
        ];
    }

    private function graphTraversal(): array
    {
        return [
            'title' => 'Parcours de Graphe (BFS/DFS)',
            'description' => 'Traverse un graphe non oriente representee par liste d\'adjacence. BFS (file) et DFS (pile/recursion).',
            'tags' => ['algorithme', 'graphe', 'bfs', 'dfs'],
            'snippets' => [
                'python' => <<<'PY'
from collections import deque


def bfs(graphe, depart):
    visite = {depart}
    q = deque([depart])
    ordre = []
    while q:
        n = q.popleft()
        ordre.append(n)
        for voisin in graphe[n]:
            if voisin not in visite:
                visite.add(voisin)
                q.append(voisin)
    return ordre


def dfs(graphe, depart):
    visite, ordre = set(), []

    def parcours(n):
        visite.add(n)
        ordre.append(n)
        for v in graphe[n]:
            if v not in visite:
                parcours(v)

    parcours(depart)
    return ordre


if __name__ == "__main__":
    g = {
        'A': ['B', 'C'],
        'B': ['A', 'D', 'E'],
        'C': ['A', 'F'],
        'D': ['B'], 'E': ['B', 'F'], 'F': ['C', 'E'],
    }
    print("BFS:", bfs(g, 'A'))
    print("DFS:", dfs(g, 'A'))
PY,
                'java' => <<<'JAVA'
import java.util.*;

public class GraphTraversal {
    public static List<String> bfs(Map<String, List<String>> g, String start) {
        Set<String> seen = new HashSet<>();
        Deque<String> q = new ArrayDeque<>();
        List<String> order = new ArrayList<>();
        q.add(start); seen.add(start);
        while (!q.isEmpty()) {
            String n = q.poll();
            order.add(n);
            for (String v : g.getOrDefault(n, List.of())) {
                if (seen.add(v)) q.add(v);
            }
        }
        return order;
    }

    public static List<String> dfs(Map<String, List<String>> g, String start) {
        Set<String> seen = new HashSet<>();
        List<String> order = new ArrayList<>();
        dfsRec(g, start, seen, order);
        return order;
    }

    private static void dfsRec(Map<String, List<String>> g, String n, Set<String> seen, List<String> order) {
        if (!seen.add(n)) return;
        order.add(n);
        for (String v : g.getOrDefault(n, List.of())) dfsRec(g, v, seen, order);
    }

    public static void main(String[] args) {
        Map<String, List<String>> g = Map.of(
            "A", List.of("B", "C"),
            "B", List.of("A", "D", "E"),
            "C", List.of("A", "F"),
            "D", List.of("B"),
            "E", List.of("B", "F"),
            "F", List.of("C", "E")
        );
        System.out.println("BFS: " + bfs(g, "A"));
        System.out.println("DFS: " + dfs(g, "A"));
    }
}
JAVA,
                'javascript' => <<<'JS'
const bfs = (g, depart) => {
  const seen = new Set([depart]);
  const q = [depart], ordre = [];
  while (q.length) {
    const n = q.shift();
    ordre.push(n);
    for (const v of g[n] || []) {
      if (!seen.has(v)) { seen.add(v); q.push(v); }
    }
  }
  return ordre;
};

const dfs = (g, depart) => {
  const seen = new Set(), ordre = [];
  const rec = n => {
    if (seen.has(n)) return;
    seen.add(n);
    ordre.push(n);
    for (const v of g[n] || []) rec(v);
  };
  rec(depart);
  return ordre;
};

const g = {
  A: ['B', 'C'], B: ['A', 'D', 'E'], C: ['A', 'F'],
  D: ['B'], E: ['B', 'F'], F: ['C', 'E'],
};
console.log('BFS:', bfs(g, 'A'));
console.log('DFS:', dfs(g, 'A'));
JS,
            ],
        ];
    }

    private function dijkstra(): array
    {
        return [
            'title' => 'Dijkstra (Plus Court Chemin)',
            'description' => 'Plus courts chemins depuis une source sur un graphe a poids positifs. Tas-min pour extraire le noeud le plus proche.',
            'tags' => ['algorithme', 'graphe', 'plus-court-chemin', 'tas'],
            'snippets' => [
                'python' => <<<'PY'
import heapq


def dijkstra(graphe, source):
    distances = {n: float('inf') for n in graphe}
    distances[source] = 0
    tas = [(0, source)]
    while tas:
        d, n = heapq.heappop(tas)
        if d > distances[n]:
            continue
        for voisin, poids in graphe[n]:
            nd = d + poids
            if nd < distances[voisin]:
                distances[voisin] = nd
                heapq.heappush(tas, (nd, voisin))
    return distances


if __name__ == "__main__":
    g = {
        'A': [('B', 1), ('C', 4)],
        'B': [('A', 1), ('C', 2), ('D', 5)],
        'C': [('A', 4), ('B', 2), ('D', 1)],
        'D': [('B', 5), ('C', 1)],
    }
    print(dijkstra(g, 'A'))
PY,
                'java' => <<<'JAVA'
import java.util.*;

public class Dijkstra {
    record Edge(String to, int w) {}

    public static Map<String, Integer> run(Map<String, List<Edge>> g, String src) {
        Map<String, Integer> dist = new HashMap<>();
        for (String n : g.keySet()) dist.put(n, Integer.MAX_VALUE);
        dist.put(src, 0);
        PriorityQueue<int[]> pq = new PriorityQueue<>(Comparator.comparingInt(a -> a[0]));
        Map<Integer, String> nameByIdx = new HashMap<>();
        // simpler: use a PQ of entries
        PriorityQueue<Map.Entry<Integer, String>> q =
            new PriorityQueue<>(Comparator.comparingInt(Map.Entry::getKey));
        q.add(Map.entry(0, src));
        while (!q.isEmpty()) {
            var cur = q.poll();
            int d = cur.getKey();
            String n = cur.getValue();
            if (d > dist.get(n)) continue;
            for (Edge e : g.getOrDefault(n, List.of())) {
                int nd = d + e.w;
                if (nd < dist.get(e.to)) {
                    dist.put(e.to, nd);
                    q.add(Map.entry(nd, e.to));
                }
            }
        }
        return dist;
    }

    public static void main(String[] args) {
        Map<String, List<Edge>> g = new HashMap<>();
        g.put("A", List.of(new Edge("B", 1), new Edge("C", 4)));
        g.put("B", List.of(new Edge("A", 1), new Edge("C", 2), new Edge("D", 5)));
        g.put("C", List.of(new Edge("A", 4), new Edge("B", 2), new Edge("D", 1)));
        g.put("D", List.of(new Edge("B", 5), new Edge("C", 1)));
        System.out.println(run(g, "A"));
    }
}
JAVA,
                'javascript' => <<<'JS'
// Dijkstra avec tri naif de la file (OK pour petits graphes)
function dijkstra(graphe, source) {
  const dist = {};
  for (const n of Object.keys(graphe)) dist[n] = Infinity;
  dist[source] = 0;
  const q = [[0, source]];
  while (q.length) {
    q.sort((a, b) => a[0] - b[0]);
    const [d, n] = q.shift();
    if (d > dist[n]) continue;
    for (const [voisin, poids] of graphe[n] || []) {
      const nd = d + poids;
      if (nd < dist[voisin]) {
        dist[voisin] = nd;
        q.push([nd, voisin]);
      }
    }
  }
  return dist;
}

const g = {
  A: [['B', 1], ['C', 4]],
  B: [['A', 1], ['C', 2], ['D', 5]],
  C: [['A', 4], ['B', 2], ['D', 1]],
  D: [['B', 5], ['C', 1]],
};
console.log(dijkstra(g, 'A'));
JS,
            ],
        ];
    }

    private function stackAndQueue(): array
    {
        return [
            'title' => 'Pile et File (from scratch)',
            'description' => 'Implementation d\'une pile (LIFO) et d\'une file (FIFO) sans utiliser de structure native.',
            'tags' => ['structure-de-donnees', 'pile', 'file', 'debutant'],
            'snippets' => [
                'python' => <<<'PY'
class Pile:
    def __init__(self): self.data = []
    def empiler(self, v): self.data.append(v)
    def depiler(self):
        if not self.data: raise IndexError("pile vide")
        return self.data.pop()
    def sommet(self): return self.data[-1] if self.data else None
    def est_vide(self): return not self.data


class File:
    def __init__(self): self.data = []
    def enfiler(self, v): self.data.append(v)
    def defiler(self):
        if not self.data: raise IndexError("file vide")
        return self.data.pop(0)
    def tete(self): return self.data[0] if self.data else None
    def est_vide(self): return not self.data


if __name__ == "__main__":
    p = Pile(); [p.empiler(x) for x in [1, 2, 3]]
    print(p.depiler(), p.depiler())  # 3 2

    f = File(); [f.enfiler(x) for x in [1, 2, 3]]
    print(f.defiler(), f.defiler())  # 1 2
PY,
                'java' => <<<'JAVA'
import java.util.ArrayList;
import java.util.List;

public class StackQueue {
    static class Pile<T> {
        private final List<T> data = new ArrayList<>();
        public void push(T v) { data.add(v); }
        public T pop() { return data.remove(data.size() - 1); }
        public T top() { return data.isEmpty() ? null : data.get(data.size() - 1); }
        public boolean isEmpty() { return data.isEmpty(); }
    }

    static class File<T> {
        private final List<T> data = new ArrayList<>();
        public void enqueue(T v) { data.add(v); }
        public T dequeue() { return data.remove(0); }
        public T front() { return data.isEmpty() ? null : data.get(0); }
        public boolean isEmpty() { return data.isEmpty(); }
    }

    public static void main(String[] args) {
        Pile<Integer> p = new Pile<>();
        for (int v : new int[]{1, 2, 3}) p.push(v);
        System.out.println(p.pop() + " " + p.pop());

        File<Integer> f = new File<>();
        for (int v : new int[]{1, 2, 3}) f.enqueue(v);
        System.out.println(f.dequeue() + " " + f.dequeue());
    }
}
JAVA,
                'c' => <<<'C'
#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>

// Pile basee sur tableau dynamique
typedef struct {
    int *data;
    int size;
    int cap;
} Pile;

void pile_init(Pile *p) {
    p->cap = 8; p->size = 0;
    p->data = malloc(p->cap * sizeof(int));
}

void pile_push(Pile *p, int v) {
    if (p->size == p->cap) {
        p->cap *= 2;
        p->data = realloc(p->data, p->cap * sizeof(int));
    }
    p->data[p->size++] = v;
}

int pile_pop(Pile *p) { return p->data[--p->size]; }
bool pile_vide(const Pile *p) { return p->size == 0; }

// File basee sur liste chainee
typedef struct Noeud { int v; struct Noeud *suivant; } Noeud;
typedef struct { Noeud *tete; Noeud *queue; } File;

void file_init(File *f) { f->tete = f->queue = NULL; }

void file_enq(File *f, int v) {
    Noeud *n = malloc(sizeof(Noeud));
    n->v = v; n->suivant = NULL;
    if (f->queue) f->queue->suivant = n; else f->tete = n;
    f->queue = n;
}

int file_deq(File *f) {
    Noeud *n = f->tete;
    int v = n->v;
    f->tete = n->suivant;
    if (!f->tete) f->queue = NULL;
    free(n);
    return v;
}

int main(void) {
    Pile p; pile_init(&p);
    pile_push(&p, 1); pile_push(&p, 2); pile_push(&p, 3);
    printf("%d %d\n", pile_pop(&p), pile_pop(&p));
    free(p.data);

    File f; file_init(&f);
    file_enq(&f, 1); file_enq(&f, 2); file_enq(&f, 3);
    printf("%d %d\n", file_deq(&f), file_deq(&f));
    while (f.tete) file_deq(&f);
    return 0;
}
C,
                'javascript' => <<<'JS'
class Pile {
  constructor() { this.data = []; }
  empiler(v) { this.data.push(v); }
  depiler() { return this.data.pop(); }
  sommet() { return this.data[this.data.length - 1]; }
  estVide() { return this.data.length === 0; }
}

class File {
  constructor() { this.data = []; }
  enfiler(v) { this.data.push(v); }
  defiler() { return this.data.shift(); }
  tete() { return this.data[0]; }
  estVide() { return this.data.length === 0; }
}

const p = new Pile();
[1, 2, 3].forEach(v => p.empiler(v));
console.log(p.depiler(), p.depiler());

const f = new File();
[1, 2, 3].forEach(v => f.enfiler(v));
console.log(f.defiler(), f.defiler());
JS,
            ],
        ];
    }

    private function hashTable(): array
    {
        return [
            'title' => 'Table de Hachage (Chainage)',
            'description' => 'HashMap from scratch avec resolution de collisions par chainage. Hash modulo capacite.',
            'tags' => ['structure-de-donnees', 'hachage', 'collision'],
            'snippets' => [
                'python' => <<<'PY'
class TableHachage:
    def __init__(self, capacite=16):
        self.capacite = capacite
        self.buckets = [[] for _ in range(capacite)]

    def _idx(self, cle):
        return hash(cle) % self.capacite

    def mettre(self, cle, valeur):
        seau = self.buckets[self._idx(cle)]
        for i, (k, _) in enumerate(seau):
            if k == cle:
                seau[i] = (cle, valeur)
                return
        seau.append((cle, valeur))

    def obtenir(self, cle):
        for k, v in self.buckets[self._idx(cle)]:
            if k == cle: return v
        raise KeyError(cle)

    def supprimer(self, cle):
        seau = self.buckets[self._idx(cle)]
        for i, (k, _) in enumerate(seau):
            if k == cle:
                seau.pop(i)
                return True
        return False


if __name__ == "__main__":
    h = TableHachage()
    h.mettre("nom", "alice"); h.mettre("age", 30)
    print(h.obtenir("nom"), h.obtenir("age"))
PY,
                'java' => <<<'JAVA'
import java.util.ArrayList;
import java.util.List;

public class HashTable<K, V> {
    private final List<List<Entry<K, V>>> buckets;
    private final int capacity;

    public HashTable(int capacity) {
        this.capacity = capacity;
        this.buckets = new ArrayList<>(capacity);
        for (int i = 0; i < capacity; i++) buckets.add(new ArrayList<>());
    }

    private int idx(K key) {
        return (key.hashCode() & 0x7fffffff) % capacity;
    }

    public void put(K key, V value) {
        List<Entry<K, V>> bucket = buckets.get(idx(key));
        for (Entry<K, V> e : bucket) {
            if (e.key.equals(key)) { e.value = value; return; }
        }
        bucket.add(new Entry<>(key, value));
    }

    public V get(K key) {
        for (Entry<K, V> e : buckets.get(idx(key))) {
            if (e.key.equals(key)) return e.value;
        }
        return null;
    }

    private static class Entry<K, V> {
        K key; V value;
        Entry(K k, V v) { key = k; value = v; }
    }

    public static void main(String[] args) {
        HashTable<String, Integer> h = new HashTable<>(16);
        h.put("a", 1); h.put("b", 2);
        System.out.println(h.get("a") + " " + h.get("b"));
    }
}
JAVA,
                'javascript' => <<<'JS'
class TableHachage {
  constructor(capacite = 16) {
    this.capacite = capacite;
    this.buckets = Array.from({ length: capacite }, () => []);
  }

  _idx(cle) {
    let h = 0;
    const s = String(cle);
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h) % this.capacite;
  }

  mettre(cle, valeur) {
    const seau = this.buckets[this._idx(cle)];
    const i = seau.findIndex(([k]) => k === cle);
    if (i >= 0) seau[i][1] = valeur;
    else seau.push([cle, valeur]);
  }

  obtenir(cle) {
    const seau = this.buckets[this._idx(cle)];
    const e = seau.find(([k]) => k === cle);
    return e ? e[1] : undefined;
  }
}

const h = new TableHachage();
h.mettre('nom', 'alice'); h.mettre('age', 30);
console.log(h.obtenir('nom'), h.obtenir('age'));
JS,
            ],
        ];
    }

    private function fibonacci(): array
    {
        return [
            'title' => 'Fibonacci (3 versions)',
            'description' => 'Recursif naif O(2^n), memoisation O(n), iteratif O(n) espace O(1). Illustration de la programmation dynamique.',
            'tags' => ['algorithme', 'recursion', 'programmation-dynamique', 'debutant'],
            'snippets' => [
                'python' => <<<'PY'
def fib_naif(n):
    return n if n < 2 else fib_naif(n - 1) + fib_naif(n - 2)


def fib_memo(n, cache=None):
    cache = cache or {}
    if n < 2: return n
    if n in cache: return cache[n]
    cache[n] = fib_memo(n - 1, cache) + fib_memo(n - 2, cache)
    return cache[n]


def fib_iter(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a


if __name__ == "__main__":
    print(fib_naif(10), fib_memo(50), fib_iter(50))
PY,
                'java' => <<<'JAVA'
import java.util.HashMap;
import java.util.Map;

public class Fib {
    public static long naif(int n) {
        return n < 2 ? n : naif(n - 1) + naif(n - 2);
    }

    public static long memo(int n, Map<Integer, Long> cache) {
        if (n < 2) return n;
        Long c = cache.get(n);
        if (c != null) return c;
        long r = memo(n - 1, cache) + memo(n - 2, cache);
        cache.put(n, r);
        return r;
    }

    public static long iter(int n) {
        long a = 0, b = 1;
        for (int i = 0; i < n; i++) {
            long t = a + b;
            a = b; b = t;
        }
        return a;
    }

    public static void main(String[] args) {
        System.out.println(naif(10));
        System.out.println(memo(50, new HashMap<>()));
        System.out.println(iter(50));
    }
}
JAVA,
                'c' => <<<'C'
#include <stdio.h>

long fib_naif(int n) {
    return n < 2 ? n : fib_naif(n - 1) + fib_naif(n - 2);
}

long fib_iter(int n) {
    long a = 0, b = 1;
    for (int i = 0; i < n; i++) {
        long t = a + b;
        a = b; b = t;
    }
    return a;
}

int main(void) {
    printf("%ld %ld\n", fib_naif(10), fib_iter(50));
    return 0;
}
C,
                'javascript' => <<<'JS'
const fibNaif = n => n < 2 ? n : fibNaif(n - 1) + fibNaif(n - 2);

const fibMemo = (n, cache = new Map()) => {
  if (n < 2) return n;
  if (cache.has(n)) return cache.get(n);
  const r = fibMemo(n - 1, cache) + fibMemo(n - 2, cache);
  cache.set(n, r);
  return r;
};

const fibIter = n => {
  let [a, b] = [0n, 1n];
  for (let i = 0; i < n; i++) [a, b] = [b, a + b];
  return a;
};

console.log(fibNaif(10), fibMemo(50), fibIter(50).toString());
JS,
            ],
        ];
    }

    private function producerConsumer(): array
    {
        return [
            'title' => 'Producteur / Consommateur',
            'description' => 'Synchronisation classique : producteur et consommateur partagent une file bornee. Mutex + variables de condition.',
            'tags' => ['concurrence', 'synchronisation', 'mutex', 'multithreading'],
            'snippets' => [
                'python' => <<<'PY'
import threading
import queue
import time
import random


file = queue.Queue(maxsize=5)


def producteur():
    for i in range(10):
        article = f"item-{i}"
        file.put(article)
        print(f"produit {article} (size={file.qsize()})")
        time.sleep(random.uniform(0.05, 0.2))


def consommateur():
    while True:
        article = file.get()
        if article is None:
            break
        print(f"  consomme {article}")
        time.sleep(random.uniform(0.1, 0.3))
        file.task_done()


p = threading.Thread(target=producteur)
c = threading.Thread(target=consommateur, daemon=True)
p.start(); c.start()
p.join()
file.join()
PY,
                'java' => <<<'JAVA'
import java.util.concurrent.*;

public class ProdCons {
    public static void main(String[] args) throws InterruptedException {
        BlockingQueue<String> q = new ArrayBlockingQueue<>(5);

        Thread prod = new Thread(() -> {
            try {
                for (int i = 0; i < 10; i++) {
                    String item = "item-" + i;
                    q.put(item);
                    System.out.println("produit " + item);
                    Thread.sleep(100);
                }
                q.put("POISON");
            } catch (InterruptedException ignored) {}
        });

        Thread cons = new Thread(() -> {
            try {
                while (true) {
                    String item = q.take();
                    if ("POISON".equals(item)) break;
                    System.out.println("  consomme " + item);
                    Thread.sleep(200);
                }
            } catch (InterruptedException ignored) {}
        });

        prod.start(); cons.start();
        prod.join(); cons.join();
    }
}
JAVA,
                'c' => <<<'C'
#include <stdio.h>
#include <pthread.h>
#include <unistd.h>

#define CAP 5
static int buffer[CAP];
static int in_idx = 0, out_idx = 0, count = 0;
static pthread_mutex_t m = PTHREAD_MUTEX_INITIALIZER;
static pthread_cond_t not_full = PTHREAD_COND_INITIALIZER;
static pthread_cond_t not_empty = PTHREAD_COND_INITIALIZER;

void *producteur(void *_) {
    for (int i = 0; i < 10; i++) {
        pthread_mutex_lock(&m);
        while (count == CAP) pthread_cond_wait(&not_full, &m);
        buffer[in_idx] = i;
        in_idx = (in_idx + 1) % CAP;
        count++;
        printf("produit %d\n", i);
        pthread_cond_signal(&not_empty);
        pthread_mutex_unlock(&m);
        usleep(100000);
    }
    return NULL;
}

void *consommateur(void *_) {
    for (int i = 0; i < 10; i++) {
        pthread_mutex_lock(&m);
        while (count == 0) pthread_cond_wait(&not_empty, &m);
        int v = buffer[out_idx];
        out_idx = (out_idx + 1) % CAP;
        count--;
        printf("  consomme %d\n", v);
        pthread_cond_signal(&not_full);
        pthread_mutex_unlock(&m);
        usleep(200000);
    }
    return NULL;
}

int main(void) {
    pthread_t p, c;
    pthread_create(&p, NULL, producteur, NULL);
    pthread_create(&c, NULL, consommateur, NULL);
    pthread_join(p, NULL);
    pthread_join(c, NULL);
    return 0;
}
C,
            ],
        ];
    }

    private function threadPool(): array
    {
        return [
            'title' => 'Pool de Threads',
            'description' => 'Pool de N threads qui consomment des taches depuis une file commune. Principe des ExecutorService / worker pools.',
            'tags' => ['concurrence', 'multithreading', 'pool', 'file'],
            'snippets' => [
                'python' => <<<'PY'
from concurrent.futures import ThreadPoolExecutor
import time


def tache(n):
    time.sleep(0.2)
    return n * n


if __name__ == "__main__":
    with ThreadPoolExecutor(max_workers=4) as pool:
        resultats = list(pool.map(tache, range(10)))
    print(resultats)
PY,
                'java' => <<<'JAVA'
import java.util.*;
import java.util.concurrent.*;

public class Pool {
    public static void main(String[] args) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(4);
        List<Future<Integer>> futures = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            final int n = i;
            futures.add(pool.submit(() -> { Thread.sleep(200); return n * n; }));
        }
        for (Future<Integer> f : futures) System.out.print(f.get() + " ");
        System.out.println();
        pool.shutdown();
    }
}
JAVA,
                'c' => <<<'C'
#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>

#define WORKERS 4
#define TACHES 10

typedef struct Tache { int valeur; struct Tache *suivante; } Tache;

static Tache *queue = NULL;
static pthread_mutex_t m = PTHREAD_MUTEX_INITIALIZER;
static pthread_cond_t cv = PTHREAD_COND_INITIALIZER;
static int restantes = TACHES;

static void *worker(void *_) {
    while (1) {
        pthread_mutex_lock(&m);
        while (!queue && restantes > 0) pthread_cond_wait(&cv, &m);
        if (!queue) { pthread_mutex_unlock(&m); break; }
        Tache *t = queue;
        queue = queue->suivante;
        pthread_mutex_unlock(&m);
        printf("worker a traite %d\n", t->valeur);
        free(t);
    }
    return NULL;
}

int main(void) {
    pthread_t threads[WORKERS];
    for (int i = 0; i < WORKERS; i++) pthread_create(&threads[i], NULL, worker, NULL);

    for (int i = 0; i < TACHES; i++) {
        Tache *t = malloc(sizeof(Tache));
        t->valeur = i; t->suivante = NULL;
        pthread_mutex_lock(&m);
        t->suivante = queue;
        queue = t;
        restantes--;
        pthread_cond_signal(&cv);
        pthread_mutex_unlock(&m);
    }

    pthread_mutex_lock(&m);
    pthread_cond_broadcast(&cv);
    pthread_mutex_unlock(&m);

    for (int i = 0; i < WORKERS; i++) pthread_join(threads[i], NULL);
    return 0;
}
C,
                'javascript' => <<<'JS'
// Pool de "workers" simples en Node (concurrence N via Promise)
async function pool(taches, n) {
  const resultats = Array(taches.length);
  let idx = 0;

  async function worker() {
    while (true) {
      const i = idx++;
      if (i >= taches.length) return;
      resultats[i] = await taches[i]();
    }
  }

  await Promise.all(Array.from({ length: n }, worker));
  return resultats;
}

const taches = Array.from({ length: 10 }, (_, i) => async () => {
  await new Promise(r => setTimeout(r, 200));
  return i * i;
});

pool(taches, 4).then(r => console.log(r));
JS,
            ],
        ];
    }

    private function httpRequestRaw(): array
    {
        return [
            'title' => 'Requete HTTP GET (socket brut)',
            'description' => 'Emet une requete HTTP GET sans lib HTTP — juste un socket TCP et du texte. Illustre le protocole HTTP/1.1.',
            'tags' => ['reseau', 'http', 'socket', 'protocole'],
            'snippets' => [
                'python' => <<<'PY'
import socket

HOTE = "example.com"
requete = (
    f"GET / HTTP/1.1\r\n"
    f"Host: {HOTE}\r\n"
    f"Connection: close\r\n"
    f"User-Agent: raw-socket/1.0\r\n\r\n"
)

with socket.create_connection((HOTE, 80), timeout=5) as s:
    s.sendall(requete.encode())
    morceaux = []
    while (data := s.recv(4096)):
        morceaux.append(data)

reponse = b"".join(morceaux).decode(errors="replace")
print(reponse.split("\r\n\r\n", 1)[0])  # headers seulement
PY,
                'java' => <<<'JAVA'
import java.io.*;
import java.net.*;

public class HttpRaw {
    public static void main(String[] args) throws IOException {
        try (Socket s = new Socket("example.com", 80);
             OutputStream out = s.getOutputStream();
             BufferedReader in = new BufferedReader(new InputStreamReader(s.getInputStream()))) {

            String req = "GET / HTTP/1.1\r\n"
                       + "Host: example.com\r\n"
                       + "Connection: close\r\n"
                       + "User-Agent: raw-socket/1.0\r\n\r\n";
            out.write(req.getBytes());
            out.flush();

            String line;
            while ((line = in.readLine()) != null && !line.isEmpty()) {
                System.out.println(line);
            }
        }
    }
}
JAVA,
                'c' => <<<'C'
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <netdb.h>
#include <arpa/inet.h>
#include <sys/socket.h>

int main(void) {
    struct addrinfo hints = {0}, *res;
    hints.ai_family = AF_INET;
    hints.ai_socktype = SOCK_STREAM;
    if (getaddrinfo("example.com", "80", &hints, &res) != 0) return 1;

    int s = socket(res->ai_family, res->ai_socktype, res->ai_protocol);
    connect(s, res->ai_addr, res->ai_addrlen);
    freeaddrinfo(res);

    const char *req =
        "GET / HTTP/1.1\r\n"
        "Host: example.com\r\n"
        "Connection: close\r\n"
        "User-Agent: raw-socket/1.0\r\n\r\n";
    write(s, req, strlen(req));

    char buf[4096];
    ssize_t n;
    while ((n = read(s, buf, sizeof(buf) - 1)) > 0) {
        buf[n] = '\0';
        fputs(buf, stdout);
    }
    close(s);
    return 0;
}
C,
                'javascript' => <<<'JS'
// Node.js — socket TCP brut (sans module http)
const net = require('net');

const client = net.connect(80, 'example.com', () => {
  client.write(
    'GET / HTTP/1.1\r\n' +
    'Host: example.com\r\n' +
    'Connection: close\r\n' +
    'User-Agent: raw-socket/1.0\r\n\r\n'
  );
});

let buf = '';
client.on('data', d => { buf += d.toString(); });
client.on('end', () => {
  const [headers] = buf.split('\r\n\r\n');
  console.log(headers);
});
JS,
            ],
        ];
    }

    private function xorCaesarCipher(): array
    {
        return [
            'title' => 'Chiffrements Pedagogiques (XOR / Cesar)',
            'description' => 'Deux chiffrements classiques a visee pedagogique. NE PAS utiliser en prod : aucun des deux n\'est sur.',
            'tags' => ['crypto', 'debutant', 'pedagogique'],
            'snippets' => [
                'python' => <<<'PY'
def cesar(texte, decalage):
    r = []
    for c in texte:
        if c.isupper():
            r.append(chr((ord(c) - 65 + decalage) % 26 + 65))
        elif c.islower():
            r.append(chr((ord(c) - 97 + decalage) % 26 + 97))
        else:
            r.append(c)
    return ''.join(r)


def xor(texte: bytes, cle: bytes) -> bytes:
    return bytes(b ^ cle[i % len(cle)] for i, b in enumerate(texte))


if __name__ == "__main__":
    print(cesar("Hello, World!", 3))
    chiffre = xor(b"secret", b"key")
    print(chiffre.hex(), xor(chiffre, b"key"))
PY,
                'java' => <<<'JAVA'
public class SimpleCipher {
    public static String cesar(String texte, int decalage) {
        StringBuilder sb = new StringBuilder();
        for (char c : texte.toCharArray()) {
            if (c >= 'A' && c <= 'Z') sb.append((char) ((c - 'A' + decalage + 26) % 26 + 'A'));
            else if (c >= 'a' && c <= 'z') sb.append((char) ((c - 'a' + decalage + 26) % 26 + 'a'));
            else sb.append(c);
        }
        return sb.toString();
    }

    public static byte[] xor(byte[] texte, byte[] cle) {
        byte[] out = new byte[texte.length];
        for (int i = 0; i < texte.length; i++) out[i] = (byte) (texte[i] ^ cle[i % cle.length]);
        return out;
    }

    public static void main(String[] args) {
        System.out.println(cesar("Hello, World!", 3));
        byte[] c = xor("secret".getBytes(), "key".getBytes());
        System.out.println(new String(xor(c, "key".getBytes())));
    }
}
JAVA,
                'c' => <<<'C'
#include <stdio.h>
#include <string.h>
#include <ctype.h>

void cesar(char *s, int decalage) {
    for (; *s; s++) {
        if (*s >= 'A' && *s <= 'Z') *s = 'A' + (((*s - 'A') + decalage) % 26 + 26) % 26;
        else if (*s >= 'a' && *s <= 'z') *s = 'a' + (((*s - 'a') + decalage) % 26 + 26) % 26;
    }
}

void xor_inplace(char *texte, size_t n, const char *cle, size_t k) {
    for (size_t i = 0; i < n; i++) texte[i] ^= cle[i % k];
}

int main(void) {
    char msg[] = "Hello, World!";
    cesar(msg, 3);
    printf("%s\n", msg);

    char secret[] = "secret";
    const char *cle = "key";
    xor_inplace(secret, strlen(secret), cle, strlen(cle));
    xor_inplace(secret, strlen("secret"), cle, strlen(cle));
    printf("%s\n", secret);
    return 0;
}
C,
                'javascript' => <<<'JS'
function cesar(texte, decalage) {
  return [...texte].map(c => {
    const code = c.charCodeAt(0);
    if (code >= 65 && code <= 90) return String.fromCharCode(((code - 65 + decalage) % 26 + 26) % 26 + 65);
    if (code >= 97 && code <= 122) return String.fromCharCode(((code - 97 + decalage) % 26 + 26) % 26 + 97);
    return c;
  }).join('');
}

function xorBytes(texte, cle) {
  const a = new TextEncoder().encode(texte);
  const k = new TextEncoder().encode(cle);
  return a.map((b, i) => b ^ k[i % k.length]);
}

console.log(cesar('Hello, World!', 3));
const c = xorBytes('secret', 'key');
console.log(new TextDecoder().decode(xorBytes(new TextDecoder().decode(c), 'key')));
JS,
            ],
        ];
    }
}

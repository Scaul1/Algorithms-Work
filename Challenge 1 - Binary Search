/* Returns either the index of the location in the array,
  or -1 if the array did not contain the targetValue */
var doSearch = function(array, targetValue) {
	//declaring variables
	var min = 0;
	var max = array.length - 1;
    var guess;
    var count=1;

    while(max>=min)
    {
        guess=floor((max+min)/2);
        println(guess);
        if (array[guess]===targetValue)
        {
            println(count+"guesses have been used");
            return guess;
        }
        else if (array[guess]<targetValue)
        {
            min=guess+1;
        }
        else
        {
            max=guess-1;
        }
        count++;
    }

	return -1;
};

//array of prime numbers
var primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 
		41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];

var result = doSearch(primes, 73);
println("Found prime at index " + result);

//checking that the function works
Program.assertEqual(doSearch(primes, 73), 20);
Program.assertEqual(doSearch(primes, 17), 6);
Program.assertEqual(doSearch(primes, 83), 22);
Program.assertEqual(doSearch(primes, 2), 0);
